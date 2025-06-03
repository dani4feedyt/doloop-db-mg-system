
const cron = require('node-cron');
const sql = require('mssql');
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    }
});

function startCronJobs() {
    cron.schedule('0 3 * * *', async () => {
        console.log('Running auto-delete job...');
        try {
            const pool = await connect({
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                server: process.env.DB_SERVER,
                database: process.env.DB_NAME,
                options: { encrypt: true, trustServerCertificate: true }
            });

            const result = await pool.request().query(`
                SELECT u_id FROM candidate_card
                WHERE created_at <= DATEADD(year, -1, GETDATE())
            `);

            for (const row of result.recordset) {
                const uId = row.u_id;

                await pool.request().input('u_id', Int, uId).query('DELETE FROM c_licenses WHERE u_id = @u_id');
                await pool.request().input('u_id', Int, uId).query('DELETE FROM c_exp_list WHERE u_id = @u_id');
                await pool.request().input('u_id', Int, uId).query('DELETE FROM selection_card WHERE u_id = @u_id');
                await pool.request().input('u_id', Int, uId).query('DELETE FROM candidate_card WHERE u_id = @u_id');

                console.log(`Deleted candidate with u_id: ${uId}`);
            }
        } catch (err) {
            console.error('Error during auto-delete cron:', err);
        }
    });

    cron.schedule('0 16 * * *', async () => {
        console.log('Running daily candidate contact_date reminder job...');
    
        const today = new Date().toISOString().slice(0, 10);
    
        try {
            await sql.connect({
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                server: process.env.DB_SERVER,
                database: process.env.DB_NAME,
                options: { encrypt: true, trustServerCertificate: true }
            });
    
            const result = await sql.query(`
                SELECT name, surname, [e-mail], contact_date 
                FROM candidate_card 
                WHERE contact_date = '${today}'
            `);
    
            for (const candidate of result.recordset) {
                if (!candidate['e-mail']) continue;
    
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: "dan.arbatov@ukr.net", //candidate['e-mail']
                    subject: 'Reminder: Contact Scheduled for Today',
                    text: `Dear ${candidate.name} ${candidate.surname},\n\nThis is a friendly reminder that we scheduled to contact you today.\n\nBest regards,\nHR Team`
                };
    
                await transporter.sendMail(mailOptions);
                console.log(`Contact reminder sent to: ${candidate['e-mail']}`);
            }
    
        } catch (error) {
            console.error('Error sending contact_date reminders:', error);
        }
    });
    
    cron.schedule('5 16 * * *', async () => {
        console.log('Running daily selection process reminder job...');
    
        const today = new Date().toISOString().slice(0, 10);
    
        try {
            await sql.connect({
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                server: process.env.DB_SERVER,
                database: process.env.DB_NAME,
                options: { encrypt: true, trustServerCertificate: true }
            });
    
            const result = await sql.query(`
                SELECT c.name, c.surname, c.[e-mail], s.interview_date, s.work_start_date
                FROM selection_card s
                JOIN candidate_card c ON s.u_id = c.u_id
                WHERE s.interview_date = '${today}' OR s.work_start_date = '${today}'
            `);
    
            for (const candidate of result.recordset) {
                if (!candidate['e-mail']) continue;
    
                let subject = '', body = '';
    
                if (candidate.interview_date?.toISOString().slice(0, 10) === today) {
                    subject = 'Interview Reminder';
                    body = `Dear ${candidate.name} ${candidate.surname},\n\nThis is a reminder that your interview is scheduled for today.\n\nBest regards,\nHR Team`;
                } else if (candidate.work_start_date?.toISOString().slice(0, 10) === today) {
                    subject = 'Welcome to Your First Day!';
                    body = `Dear ${candidate.name} ${candidate.surname},\n\nWe’re excited to welcome you today on your first day at work!\n\nSee you soon,\nHR Team`;
                }
    
                if (subject && body) {
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: "dan.arbatov@ukr.net",
                        subject,
                        text: body
                    });
    
                    console.log(`${subject} sent to: ${candidate['e-mail']}`);
                }
            }
    
        } catch (error) {
            console.error('Error sending selection process reminders:', error);
        }
    });
}

module.exports = startCronJobs;