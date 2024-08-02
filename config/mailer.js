import { createTransport } from "nodemailer";
import path from "path";
import { config } from "dotenv";

const __dirname = path.resolve();
config();

const mailer = createTransport({
    host: 'smtp-relay.brevo.com',
    port: '587',
    secure: false,
    auth: {
        user: "795d1a001@smtp-brevo.com",
        pass: "hFagtmxOVn4HpqyR"
    }
})

export default mailer;
