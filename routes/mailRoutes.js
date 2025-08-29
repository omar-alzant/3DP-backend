const express = require('express');
const nodemailer = require("nodemailer");
const path = require("path");
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const loggerSupa = require("../config/loggerSupabase");


router.post("/send-order", authMiddleware, async (req, res) => {
    const {cartItems, customer} = req.body; 
    const userId = req.id;

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.MY_EMAIL,
                pass: process.env.MY_PASSWORD
            }
        });

        let itemsHtml = cartItems.map(item => `
            <li>
              <strong>الملف:</strong> ${item.name} <br/>
              <strong>النوع:</strong> ${item.type} <br/>
              <strong>الحجم:</strong> ${item.volume} سم³ <br/>
              <strong>السعر:</strong> $${item.price} <br/>
              <strong>عدد الوجوه:</strong> ${item.facets} <br/>
              <strong>الكمية:</strong> ${item.quantity}
            </li>
        `).join("<br/>");

        // attachments (يدعم local path أو URL)
        const attachments = cartItems.map(item => {
            // لو الرابط يبدأ بـ http يعني URL
            if (item.fileUrl.startsWith("http")) {
                return {
                    filename: item.name,
                    path: item.fileUrl   // URL مباشر
                };
            } else {
                // نفترض إنك خازن الملفات محليًا بمجلد uploads
                const filePath = path.join(__dirname, "../uploads", path.basename(item.fileUrl));
                return {
                    filename: item.name,
                    path: filePath
                };
            }
        });

        const mailOptions = {
            from: "3D-Maker-OjZ",
            to: "omarzant17@gmail.com",
            subject: "طلب جديد من الموقع",
            html: `
                <h2>📦 تفاصيل العميل:</h2>
                <p><strong>الاسم:</strong> ${customer.name}</p>
                <p><strong>الهاتف:</strong> ${customer.phone}</p>
                <p><strong>العنوان:</strong> ${customer.address}</p>
                <hr/>
                <h2>📦 تفاصيل الطلب:</h2>
                <ul>
                ${itemsHtml}
                </ul>
            `,
            attachments: attachments
        };

        await transporter.sendMail(mailOptions);

        loggerSupa(`SendOrderMail.Info`, 'تم إرسال الطلب مع المرفقات بنجاح', userId);  

        res.status(200).json({ success: true, message: "تم إرسال الطلب مع المرفقات بنجاح" });
    } catch (err) {
        loggerSupa(`SendOrderMail.Error`, `Error sending email: ${err.message}`, userId);  
        console.error("Error sending email:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
