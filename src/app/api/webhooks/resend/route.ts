import { NextResponse } from "next/server";
import { Webhook } from "svix";
import prisma from "@/lib/db";

const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const payload = await req.text();
    const headersList = req.headers;
    const svix_id = headersList.get("svix-id");
    const svix_timestamp = headersList.get("svix-timestamp");
    const svix_signature = headersList.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature || !webhookSecret) {
      return NextResponse.json({ error: "Missing webhook secret or svix headers" }, { status: 400 });
    }

    const wh = new Webhook(webhookSecret);
    let evt: any;

    try {
      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err: any) {
      console.error("Webhook verification failed:", err.message);
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }

    // Deduplicate event processing
    const provider_event_id = evt.id; // Resend usually provides an ID? wait, svix_id is unique
    const uniqueEventId = svix_id;

    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { provider_event_id: uniqueEventId }
    });

    if (existingEvent && existingEvent.processed) {
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    if (!existingEvent) {
      await prisma.webhookEvent.create({
        data: {
          provider: "resend",
          provider_event_id: uniqueEventId,
          event_type: evt.type,
          payload: evt,
          processed: false
        }
      });
    }

    if (evt.type === "email.received") {
      const data = evt.data;
      const fromEmail = data.from;
      const toEmail = data.to[0] || data.to;
      const subject = data.subject;
      const text = data.text;
      const html = data.html;

      // Extract raw email address from `Name <email@domain.com>`
      const extractEmail = (str: string) => {
        const match = str.match(/<([^>]+)>/);
        return match ? match[1].toLowerCase() : str.toLowerCase().trim();
      };

      const rawFromEmail = extractEmail(fromEmail);

      let contact = await prisma.contact.findFirst({
        where: { email: rawFromEmail }
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            email: rawFromEmail,
            send_status: "Replied" // Incoming mail means they replied/messaged
          }
        });
      } else {
        contact = await prisma.contact.update({
          where: { id: contact.id },
          data: { send_status: "Replied" }
        });
      }



      let conversation = await prisma.conversation.findFirst({
        where: { contact_id: contact.id },
        orderBy: { created_at: "desc" }
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { contact_id: contact.id, subject: subject }
        });
      }

      await prisma.message.create({
        data: {
          conversation_id: conversation.id,
          contact_id: contact.id,
          direction: "received",
          provider_message_id: data.id || evt.id,
          from_email: fromEmail,
          to_email: toEmail,
          subject: subject,
          text_body: text,
          html_body: html,
          status: "Received",
          received_at: new Date()
        }
      });
    }

    if (evt.type === "email.bounced" || evt.type === "email.delivery_delayed" || evt.type === "email.failed") {
      const data = evt.data;
      const provider_message_id = data.email_id || data.id;
      const reason = data.bounce_summary || data.reason || data.error || "Delivery failed or bounced";
      
      if (provider_message_id) {
        const message = await prisma.message.findFirst({
          where: { provider_message_id }
        });

        if (message) {
          await prisma.message.update({
            where: { id: message.id },
            data: {
              status: "Bounced",
              error_message: typeof reason === 'string' ? reason : JSON.stringify(reason)
            }
          });

          const updatedContact = await prisma.contact.update({
            where: { id: message.contact_id },
            data: { send_status: "Bounced" }
          });
          

        }
      }
    }

    // Mark as processed
    await prisma.webhookEvent.update({
      where: { provider_event_id: uniqueEventId },
      data: { processed: true }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
