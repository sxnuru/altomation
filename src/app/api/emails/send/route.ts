import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Resend } from "resend";

function personalizeContent(content: string, contact: any) {
  let personalized = content;
  const variables = {
    first_name: contact.first_name || "",
    last_name: contact.last_name || "",
    company: contact.company || "",
    email: contact.email || ""
  };
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, "gi");
    personalized = personalized.replace(regex, value);
  }
  
  return personalized;
}

export async function POST(req: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { contactId, fromEmail, subject, body } = await req.json();

    if (!contactId || !subject || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const personalizedSubject = personalizeContent(subject, contact);
    const personalizedBodyText = personalizeContent(body, contact);
    const personalizedBodyHtml = personalizedBodyText.replace(/\n/g, "<br>");

    const senderEmail = fromEmail || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    let htmlFooter = "";
    
    if (senderEmail === "faraz@mail.antilineartech.com") {
      htmlFooter = `
<br/>
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Montserrat,Arial,Helvetica,sans-serif;max-width:550px;">
	<tbody valign="middle">
		<tr valign="inherit">
			<td style="padding:20px 20px 15px 0;" valign="inherit">
				<table cellpadding="0" cellspacing="0" border="0">
					<tbody valign="middle">
						<tr valign="inherit">
							<td valign="inherit" style="padding-right:16px;">
								<div style="width:1px;height:110px;background-color:#dcdcdc;font-size:0;line-height:0;">&nbsp;</div>
							</td>
							<td valign="inherit">
								<table cellpadding="0" cellspacing="0" border="0">
									<tbody valign="middle">
										<tr valign="inherit">
											<td style="padding-bottom:4px;" valign="inherit"><span style="font-size:20px;font-weight:bold;letter-spacing:0.5px;color:#000000;">FARAZ ASAD</span></td>
										</tr>
										<tr valign="inherit">
											<td style="padding-bottom:10px;" valign="inherit"><span style="font-size:13px;color:#333333;">Chief Product Officer</span> <span style="font-size:13px;color:#666666;">&nbsp;|&nbsp;</span> <span style="font-size:13px;color:#333333;">Anti-Linear Technologies</span></td>
										</tr>
										<tr valign="inherit">
											<td style="padding-bottom:4px;" valign="inherit"><span style="font-size:12px;color:#555555;">+92 331 1170170</span></td>
										</tr>
										<tr valign="inherit">
											<td style="padding-bottom:4px;" valign="inherit"><a href="mailto:faraz@mail.antilineartech.com" style="font-size:12px;color:#555555;text-decoration:none;">faraz@mail.antilineartech.com</a></td>
										</tr>
										<tr valign="inherit">
											<td style="padding-bottom:12px;" valign="inherit"><a href="https://antilineartech.com" style="font-size:12px;color:#555555;text-decoration:none;">antilineartech.com</a></td>
										</tr>
										<tr valign="inherit">
											<td valign="inherit">
												<table cellpadding="0" cellspacing="0" border="0">
													<tbody valign="middle">
														<tr valign="inherit">
															<td style="padding-right:6px;" valign="inherit">
																<a href="https://wa.me/923311170170" style="text-decoration:none;">
																	<table cellpadding="0" cellspacing="0" style="width:24px;height:24px;background-color:#2b2b2b;border-radius:50%;" width="24" height="24" bgcolor="#2b2b2b">
																		<tbody valign="middle">
																			<tr valign="inherit">
																				<td align="center" valign="inherit" style="font-size:11px;color:#ffffff;">☎</td>
																			</tr>
																		</tbody>
																	</table>
																</a></td>
															<td style="padding-right:6px;" valign="inherit">
																<a href="mailto:faraz@mail.antilineartech.com" style="text-decoration:none;">
																	<table cellpadding="0" cellspacing="0" style="width:24px;height:24px;background-color:#2b2b2b;border-radius:50%;" width="24" height="24" bgcolor="#2b2b2b">
																		<tbody valign="middle">
																			<tr valign="inherit">
																				<td align="center" valign="inherit" style="font-size:11px;color:#ffffff;">✉</td>
																			</tr>
																		</tbody>
																	</table>
																</a></td>
															<td valign="inherit">
																<a href="https://pk.linkedin.com/company/anti-linear-technologies" style="text-decoration:none;">
																	<table cellpadding="0" cellspacing="0" style="width:24px;height:24px;background-color:#2b2b2b;border-radius:50%;" width="24" height="24" bgcolor="#2b2b2b">
																		<tbody valign="middle">
																			<tr valign="inherit">
																				<td align="center" valign="inherit" style="font-size:10px;color:#ffffff;font-weight:bold;">in</td>
																			</tr>
																		</tbody>
																	</table>
																</a></td>
														</tr>
													</tbody>
												</table>
											</td>
										</tr>
									</tbody>
								</table>
							</td>
						</tr>
					</tbody>
				</table>
			</td>
		</tr>
		<tr valign="inherit">
			<td style="padding:0 20px 20px 0;" valign="inherit">
				<a href="https://antilineartech.com" style="text-decoration:none;"><img src="https://res.cloudinary.com/dfnzdlvfe/image/upload/v1786346069/yes_2_v2g3i3.png" width="510" alt="Break the Line. Rebuild the Business" style="display: block; border: 0px; width: 100%; max-width: 510px; height: auto;" /></a>
			</td>
		</tr>
	</tbody>
</table>
      `;
    }

    const finalHtml = `${personalizedBodyHtml}${htmlFooter}`;

    // Find or create a conversation
    let conversation = await prisma.conversation.findFirst({
      where: { contact_id: contact.id }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { contact_id: contact.id, subject: personalizedSubject }
      });
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: senderEmail,
      to: contact.email,
      subject: personalizedSubject,
      html: finalHtml,
      text: personalizedBodyText
    });

    if (error) {
      // Store failed message
      await prisma.message.create({
        data: {
          conversation_id: conversation.id,
          contact_id: contact.id,
          direction: "sent",
          from_email: senderEmail,
          to_email: contact.email,
          subject: personalizedSubject,
          text_body: personalizedBodyText,
          html_body: finalHtml,
          status: "Failed",
          error_message: error.message
        }
      });
      
      await prisma.contact.update({
        where: { id: contact.id },
        data: { send_status: "Failed" }
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Store successful message
    await prisma.message.create({
      data: {
        conversation_id: conversation.id,
        contact_id: contact.id,
        direction: "sent",
        provider_message_id: data?.id,
        from_email: senderEmail,
        to_email: contact.email,
        subject: personalizedSubject,
        text_body: personalizedBodyText,
        html_body: finalHtml,
        status: "Sent",
        sent_at: new Date()
      }
    });

    await prisma.contact.update({
      where: { id: contact.id },
      data: { send_status: "Sent" }
    });

    return NextResponse.json({ success: true, messageId: data?.id });

  } catch (error: any) {
    console.error("Send email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
