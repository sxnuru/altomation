import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const importSchema = z.object({
  filename: z.string(),
  contacts: z.array(z.any()),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = importSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { filename, contacts } = result.data;
    
    if (contacts.length === 0) {
      return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
    }

    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;

    // Detect email column by finding the first key that includes 'email' (case insensitive)
    const firstRow = contacts[0];
    const emailKey = Object.keys(firstRow).find(key => key.toLowerCase().includes('email'));

    if (!emailKey) {
      return NextResponse.json({ error: "Could not detect an email column in the uploaded file" }, { status: 400 });
    }

    // Process contacts to extract known fields and put the rest in metadata
    const parsedContacts = contacts.map(row => {
      const email = row[emailKey]?.toString().trim().toLowerCase();
      if (!email || !z.string().email().safeParse(email).success) {
        return null; // Invalid
      }
      
      const findField = (keys: string[]) => {
        const found = Object.keys(row).find(k => keys.some(key => k.toLowerCase().includes(key)));
        return found ? row[found]?.toString().trim() : null;
      };

      const first_name = findField(['first name', 'firstname', 'first_name']);
      const last_name = findField(['last name', 'lastname', 'last_name']);
      const company = findField(['company', 'organization']);
      const job_title = findField(['job title', 'title', 'role']);
      const phone = findField(['phone', 'mobile']);
      const website = findField(['website', 'url', 'site']);

      // Remove extracted fields from metadata
      const metadata = { ...row };
      delete metadata[emailKey];
      
      return {
        email,
        first_name,
        last_name,
        company,
        job_title,
        phone,
        website,
        metadata
      };
    }).filter(c => {
      if (c === null) {
        invalidCount++;
        return false;
      }
      return true;
    });

    if (parsedContacts.length === 0) {
      return NextResponse.json({ error: "No valid contacts found to import" }, { status: 400 });
    }

    // Create the import batch
    const importBatch = await prisma.importBatch.create({
      data: {
        filename,
        original_row_count: contacts.length,
        valid_count: 0, // we will update later
        invalid_count: invalidCount,
        duplicate_count: 0,
      }
    });

    // We will do an upsert or bulk insert ignoring duplicates.
    // Prisma createMany does not support 'skipDuplicates' returning the count of skipped accurately.
    // So we fetch existing emails first to calculate duplicate count.
    const emails = parsedContacts.map(c => c!.email);
    const existingContacts = await prisma.contact.findMany({
      where: { email: { in: emails } },
      select: { email: true }
    });
    
    const existingEmails = new Set(existingContacts.map(c => c.email));
    const newContacts = parsedContacts.filter(c => !existingEmails.has(c!.email));
    
    duplicateCount = existingEmails.size;
    validCount = newContacts.length;

    if (newContacts.length > 0) {
      await prisma.contact.createMany({
        data: newContacts.map(c => ({
          ...c!,
          import_batch_id: importBatch.id
        })),
        skipDuplicates: true
      });
    }

    // Update batch stats
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        valid_count: validCount,
        duplicate_count: duplicateCount
      }
    });

    return NextResponse.json({
      message: "Import complete",
      summary: {
        total: contacts.length,
        imported: validCount,
        duplicates: duplicateCount,
        invalid: invalidCount
      }
    });

  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
