const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const helmet = require('helmet');
const sql = require('mssql');
const session = require('express-session');
const multer = require('multer');
const upload = multer();
const startCronJobs = require('./cronJobs');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');

// Helmet CSP configuration
app.use(helmet({ 
    contentSecurityPolicy: {
        useDefaults: false,
        directives: {
            defaultSrc: ["'none'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            fontSrc: ["'self'"],
            imgSrc: ["'self'"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameSrc: ["'none'"],
            mediaSrc: ["'none'"],
            manifestSrc: ["'none'"],
            workerSrc: ["'none'"],
            childSrc: ["'none'"],
            upgradeInsecureRequests: [],
            blockAllMixedContent: []
        }
    }
}));

app.use(cookieParser());

require('dotenv').config();


app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        sameSite: 'Strict',
        secure: process.env.NODE_ENV === 'production',
    }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));


function requireDbLogin(req, res, next) {
    const skipPaths = ['/login', '/favicon.ico'];
    const isStatic = req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/images') || req.path.startsWith('/public');

    if (!req.session.dbConfig && !skipPaths.includes(req.path) && !isStatic) {
        req.session.redirectAfterLogin = req.originalUrl;
        return res.redirect('/login');
    }
    next();
}

app.use(requireDbLogin);



function buildDbConfig(user, password) {
    return {
        user,
        password,
        server: process.env.DB_SERVER,
        database: process.env.DB_NAME,
        options: {
            encrypt: true,
            trustServerCertificate: true
        }
    };
}


app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { user, password } = req.body;
    const dbConfig = buildDbConfig(user, password);

    try {
        await sql.connect(dbConfig);
        req.session.dbConfig = dbConfig;

        const redirectTo = req.session.redirectAfterLogin || '/';
        delete req.session.redirectAfterLogin;
        res.redirect(redirectTo);

    } catch (err) {
        console.error('DB connection failed:', err.message);
        res.send('Login failed. Please check your DB credentials.');
    }
});

app.use((req, res, next) => {
    if (!req.session.dbConfig) return next();
    csrf({
        cookie: {
            httpOnly: true,
            sameSite: 'Strict',
            secure: process.env.NODE_ENV === 'production'
        }
    })(req, res, next);
});

function requireDbLogin(req, res, next) {
    const skipPaths = ['/login', '/favicon.ico'];
    const isStatic = req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/images') || req.path.startsWith('/public');

    if (!req.session.dbConfig && !skipPaths.includes(req.path) && !isStatic) {
        req.session.redirectAfterLogin = req.originalUrl;
        return res.redirect('/login');
    }
    next();
}


app.get('/', requireDbLogin, async (req, res) => {
    try {
        await sql.connect(req.session.dbConfig);
        const result = await sql.query('SELECT * FROM candidate_card'); // Modify as needed
        res.render('index', { data: result.recordset, csrfToken: req.csrfToken() });
    } catch (err) {
        console.error(err);
        res.status(500).send('Database error');
    }
});

app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        res.status(403).send('Forbidden - invalid CSRF token');
    } else {
        next(err);
    }
});

startCronJobs();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


app.use(express.json());


app.get('/positions/new', requireDbLogin, async (req, res) => {
    try {
        const pool = await sql.connect(req.session.dbConfig);

        const result = await pool.request().query(`
            SELECT ISNULL(MAX(pos_id), 0) + 1 AS nextId FROM s_positions
        `);

        const newPosId = result.recordset[0].nextId;
        if (!Number.isInteger(newPosId)) {
            throw new Error(`Invalid nextId received: ${newPosId}`);
        }

        await pool.request()
            .input('pos_id', sql.Int, newPosId)
            .input('position_name', sql.VarChar(sql.MAX), '')
            .input('places_count', sql.Int, 1)
            .input('places_left', sql.Int, 1)
            .input('creation_date', sql.Date, new Date())
            .query(`
                INSERT INTO s_positions (
                    pos_id, position_name, places_count, places_left, creation_date
                ) VALUES (
                    @pos_id, @position_name, @places_count, @places_left, @creation_date
                )
            `);

        res.redirect(`/positions/${newPosId}`);

    } catch (err) {
        console.error('Error creating new position:', err);
        res.status(500).send('Could not create new position.');
    }
});


app.get('/positions/:id', requireDbLogin, async (req, res) => {
    const posId = parseInt(req.params.id, 10);

    try {
        await sql.connect(req.session.dbConfig);

        const result = await sql.query(`
            SELECT * FROM s_positions WHERE pos_id = ${posId}
        `);

        if (result.recordset.length === 0) {
            return res.status(404).send('Position not found');
        }

        const position = result.recordset[0];

        res.render('pos', {
            position,
            csrfToken: req.csrfToken()
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Database error');
    }
});

app.post('/positions/:id/update-field', requireDbLogin, async (req, res) => {
    const { field, value } = req.body;
    const posId = parseInt(req.params.id, 10);

    const allowedFields = [
        'position_name', 'places_count', 'places_left', 'creation_date'
    ];

    if (!allowedFields.includes(field)) {
        return res.status(400).send('Invalid field');
    }

    try {
        const pool = await sql.connect(req.session.dbConfig);
        await pool.request()
            .input('value', sql.VarChar, value)
            .input('id', sql.Int, posId)
            .query(`UPDATE s_positions SET [${field}] = @value WHERE pos_id = @id`);

        res.sendStatus(200);
    } catch (err) {
        console.error('DB update error:', err);
        res.status(500).send('Database update error');
    }
});


app.post('/positions/:id/delete', requireDbLogin, async (req, res) => {
    const posId = parseInt(req.params.id, 10);

    try {
        const pool = await sql.connect(req.session.dbConfig);

        await pool.request()
            .input('pos_id', sql.Int, posId)
            .query('DELETE FROM s_positions WHERE pos_id = @pos_id');

        res.status(200).send('Deleted');
    } catch (err) {
        console.error('Error deleting position:', err);
        res.status(500).send('Failed to delete position.');
    }
});


app.get('/api/positions', requireDbLogin, async (req, res) => {
    try {
        const pool = await sql.connect(req.session.dbConfig);
        const result = await pool.request().query(`
            SELECT position_name, places_left
            FROM s_positions
            WHERE places_left > 0
        `);

        const options = result.recordset.map(row => ({
            name: `${row.position_name} (${row.places_left} left)`,
            value: row.position_name
        }));

        res.json(options);
    } catch (err) {
        console.error('Failed to load positions:', err);
        res.status(500).send('Could not load available positions');
    }
});


app.get('/bio/new', requireDbLogin, async (req, res) => {
    try {
        const pool = await sql.connect(req.session.dbConfig);

        const result = await pool.request().query(`SELECT ISNULL(MAX(u_id), 0) + 1 AS nextId FROM candidate_card`);
        const newId = result.recordset[0].nextId;

        await pool.request()
            .input('u_id', sql.Int, newId)
            .input('name', sql.VarChar(sql.MAX), '')
            .input('surname', sql.VarChar(sql.MAX), '')
            .input('email', sql.VarChar(sql.MAX), '')
            .input('phone_number', sql.VarChar(sql.MAX), '')
            .input('location', sql.VarChar(sql.MAX), '')
            .input('age', sql.Int, 0)
            .input('gender', sql.VarChar(sql.MAX), '')
            .input('cv', sql.VarBinary(sql.MAX), null)
            .input('linkedin', sql.VarChar(sql.MAX), '')
            .input('employment', sql.Bit, 0)
            .input('salary', sql.VarChar(sql.MAX), '')
            .input('future', sql.Bit, 0)
            .input('contact_date', sql.Date, null)
            .input('comments', sql.VarChar(sql.MAX), '')
            .input('experience_summary', sql.VarChar(sql.MAX), '')
            .query(`
                INSERT INTO candidate_card (
                    u_id, name, surname, [e-mail], phone_number, location, age, gender,
                    cv, linkedin, [employment status], [salary expectations],
                    future_contact, contact_date, comments, experience_summary
                ) VALUES (
                    @u_id, @name, @surname, @email, @phone_number, @location, @age, @gender,
                    @cv, @linkedin, @employment, @salary,
                    @future, @contact_date, @comments, @experience_summary
                )
            `);
         const posResult = await pool.request().query(`
            SELECT TOP 1 pos_id
            FROM s_positions
            ORDER BY places_left DESC
        `);

        if (posResult.recordset.length === 0) {
            throw new Error('No available positions found.');
        }

        const selectedPosId = posResult.recordset[0].pos_id;

        await pool.request()
            .input('u_id', sql.Int, newId)
            .input('pos_id', sql.Int, selectedPosId)
            .input('selection_status', sql.VarChar(sql.MAX), 'Not started')
            .input('is_replacement', sql.Bit, 0)
            .query(`
                INSERT INTO selection_card (u_id, pos_id, selection_status, is_replacement)
                VALUES (@u_id, @pos_id, @selection_status, @is_replacement)
            `);

        res.redirect(`/bio/${newId}`);

    } catch (err) {
        console.error('Error creating new candidate:', err);
        res.status(500).send('Could not create new candidate.');
    }
});

app.get('/bio/:id', requireDbLogin, async (req, res) => {
    const userId = parseInt(req.params.id, 10);

    try {
        await sql.connect(req.session.dbConfig);

        const candidateResult = await sql.query(`
            SELECT * FROM candidate_card WHERE u_id = ${userId}
        `);

        if (candidateResult.recordset.length === 0) {
            return res.status(404).send('Candidate not found');
        }

        const candidate = candidateResult.recordset[0];

        const experienceListResult = await sql.query(`
            SELECT job_name FROM c_exp_list WHERE u_id = ${userId}
        `);

        const experienceList = experienceListResult.recordset;

        const licensesResult = await sql.query(`SELECT license_name FROM c_licenses WHERE u_id = ${userId}`);

        res.render('bio', {
            candidate,
            experience: experienceList,
            licenses: licensesResult.recordset,
            csrfToken: req.csrfToken()
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Database error');
    }
});

app.post('/bio/:id/update-field', requireDbLogin, async (req, res) => {
    const { field, value } = req.body;
    const userId = parseInt(req.params.id, 10);

    const allowedFields = [
        'name', 'surname', 'e-mail', 'phone_number', 'location',
        'age', 'gender', 'cv', 'linkedin',
        'employment status', 'salary expectations',
        'future_contact', 'contact_date', 'comments',
        'experience_summary'
    ];

    if (!allowedFields.includes(field)) {
        return res.status(400).send('Invalid field');
    }

    try {
        const pool = await sql.connect(req.session.dbConfig);
        await pool.request()
            .input('value', sql.VarChar, value)
            .input('id', sql.Int, userId)
            .query(`UPDATE candidate_card SET [${field}] = @value WHERE u_id = @id`);

        res.sendStatus(200);
    } catch (err) {
        console.error('DB error:', err);
        res.status(500).send('Database update error');
    }
});



app.post('/bio/:id/update-licenses', requireDbLogin, async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const licenses = req.body.licenses;

    if (!Array.isArray(licenses)) {
        return res.status(400).send('Invalid licenses');
    }

    try {
        const pool = await sql.connect(req.session.dbConfig);

        await pool.request()
            .input('userId', sql.Int, userId)
            .query('DELETE FROM c_licenses WHERE u_id = @userId');

        for (const lic of licenses) {
            if (lic.trim()) {
                await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('licenseName', sql.NVarChar, lic.trim())
                    .query('INSERT INTO c_licenses (u_id, license_name) VALUES (@userId, @licenseName)');
            }
        }

        res.sendStatus(200);
    } catch (err) {
        console.error('License update error:', err);
        res.status(500).send('Failed to update licenses');
    }
});


app.post('/bio/:id/update-experience-jobs', requireDbLogin, async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { job_names } = req.body;

    if (!Array.isArray(job_names)) {
        return res.status(400).send('Invalid job names');
    }

    try {
        const pool = await sql.connect(req.session.dbConfig);

        await pool.request()
            .input('userId', sql.Int, userId)
            .query('DELETE FROM c_exp_list WHERE u_id = @userId');

        for (const job of job_names) {
            if (!job) continue;

            await pool.request()
                .input('userId', sql.Int, userId)
                .input('job_name', sql.VarChar(255), job)
                .query('INSERT INTO c_exp_list (u_id, job_name) VALUES (@userId, @job_name)');
        }

        res.sendStatus(200);
    } catch (err) {
        console.error('Job names update error:', err);
        res.status(500).send('Failed to update experience jobs');
    }
});


app.post('/bio/:id/delete', requireDbLogin, async (req, res) => {
    const userId = parseInt(req.params.id, 10);

    try {
        const pool = await sql.connect(req.session.dbConfig);

        await pool.request().input('u_id', sql.Int, userId).query('DELETE FROM c_licenses WHERE u_id = @u_id');
        await pool.request().input('u_id', sql.Int, userId).query('DELETE FROM c_exp_list WHERE u_id = @u_id');
        await pool.request().input('u_id', sql.Int, userId).query('DELETE FROM selection_card WHERE u_id = @u_id');

        await pool.request().input('u_id', sql.Int, userId).query('DELETE FROM candidate_card WHERE u_id = @u_id');
        await pool.request().input('u_id', sql.Int, userId).query('DELETE FROM status_history WHERE u_id = @u_id');

        res.status(200).send({ message: 'Deleted successfully' });
    } catch (err) {
        console.error('Error deleting candidate:', err);
        res.status(500).send('Failed to delete candidate.');
    }
});


app.get('/job/:id', requireDbLogin, async (req, res) => {
    const userId = parseInt(req.params.id, 10);

    try {
        await sql.connect(req.session.dbConfig);

        const result = await sql.query(`
            SELECT 
                p.position_name, s.selection_status, s.interview_date,
                s.interview_handler, s.source, s.job_offer,
                s.candidate_decision, s.refusal_reason, s.work_start_date, s.comments,

                c.name, c.surname, c.age, c.location

            FROM selection_card s
            JOIN s_positions p ON s.pos_id = p.pos_id
            JOIN candidate_card c ON c.u_id = s.u_id
            WHERE s.u_id = ${userId}
        `);

        const historyResult = await sql.query(`
            SELECT status, changed_at
            FROM status_history
            WHERE u_id = ${userId}
            ORDER BY changed_at
        `);

        if (result.recordset.length === 0) {
            return res.status(404).send('No job selection data found for this user.');
        }

        const personInfo = {
            u_id: userId,
            name: result.recordset[0].name,
            surname: result.recordset[0].surname,
            age: result.recordset[0].age,
            location: result.recordset[0].location
        };

        const jobs = result.recordset.map(({ name, surname, age, location, ...jobData }) => jobData);

        res.render('job', {
            person: personInfo,
            jobs,
            statusHistory: historyResult.recordset,
            csrfToken: req.csrfToken()
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Database error');
    }
});



app.post('/job/:id/update-field', requireDbLogin, async (req, res) => {
    const { field, value } = req.body;
    const userId = parseInt(req.params.id, 10);

    const allowedFields = {
        'candidate_card': ['name', 'surname', 'age', 'location'],
        'selection_card': [
            'selection_status', 'interview_date', 'interview_handler',
            'source', 'job_offer', 'candidate_decision',
            'refusal_reason', 'work_start_date', 'position_name', 'comments'
        ]
    };

    let tableToUpdate = null;
    for (const [table, fields] of Object.entries(allowedFields)) {
        if (fields.includes(field)) {
            tableToUpdate = table;
            break;
        }
    }

    if (!tableToUpdate) {
        return res.status(400).send('Invalid field');
    }

    try {
        const pool = await sql.connect(req.session.dbConfig);

        if (field === 'position_name') {
            const posResult = await pool.request()
                .input('position_name', sql.VarChar, value)
                .query(`SELECT pos_id FROM s_positions WHERE position_name = @position_name`);

            if (posResult.recordset.length === 0) {
                return res.status(400).send('Invalid position name');
            }

            const pos_id = posResult.recordset[0].pos_id;

            await pool.request()
                .input('id', sql.Int, userId)
                .input('pos_id', sql.Int, pos_id)
                .query(`UPDATE selection_card SET pos_id = @pos_id WHERE u_id = @id`);

        } else if (field === 'selection_status') {
            const oldStatusResult = await pool.request()
                .input('id', sql.Int, userId)
                .query(`SELECT selection_status, pos_id FROM selection_card WHERE u_id = @id`);

            if (oldStatusResult.recordset.length === 0) {
                return res.status(404).send('Record not found');
            }

            const oldStatus = oldStatusResult.recordset[0].selection_status;
            const pos_id = oldStatusResult.recordset[0].pos_id;
            const newStatus = value;

            if (oldStatus === newStatus) {
                return res.status(200).send('No status change');
            }

            await pool.request()
                .input('value', sql.VarChar, newStatus)
                .input('id', sql.Int, userId)
                .query(`UPDATE selection_card SET selection_status = @value WHERE u_id = @id`);

            await pool.request()
                .input('u_id', sql.Int, userId)
                .input('status', sql.VarChar, newStatus)
                .input('changed_at', sql.DateTime, new Date())
                .query(`INSERT INTO status_history (u_id, status, changed_at) VALUES (@u_id, @status, @changed_at)`);

            if (oldStatus !== 'Accepted' && newStatus === 'Accepted') {
                const posCheck = await pool.request()
                    .input('pos_id', sql.Int, pos_id)
                    .query(`SELECT places_left FROM s_positions WHERE pos_id = @pos_id`);

                const placesLeft = posCheck.recordset[0]?.places_left ?? 0;

                if (placesLeft <= 0) {
                    await pool.request()
                        .input('value', sql.VarChar, oldStatus)
                        .input('id', sql.Int, userId)
                        .query(`UPDATE selection_card SET selection_status = @value WHERE u_id = @id`);

                    return res.status(400).send('No available places for this position.');
                }

                await pool.request()
                    .input('pos_id', sql.Int, pos_id)
                    .query(`UPDATE s_positions SET places_left = places_left - 1 WHERE pos_id = @pos_id`);

            } else if (oldStatus === 'Accepted' && newStatus !== 'Accepted') {
                await pool.request()
                    .input('pos_id', sql.Int, pos_id)
                    .query(`UPDATE s_positions SET places_left = places_left + 1 WHERE pos_id = @pos_id`);
            }

        } else {
            await pool.request()
                .input('value', sql.VarChar, value)
                .input('id', sql.Int, userId)
                .query(`UPDATE ${tableToUpdate} SET [${field}] = @value WHERE u_id = @id`);
        }

        res.sendStatus(200);
    } catch (err) {
        console.error('DB error:', err);
        res.status(500).send('Database update error');
    }
});


app.post('/job/:id/update-status-history', requireDbLogin, async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const history = req.body.history;

    if (!Array.isArray(history)) {
        return res.status(400).send('Invalid history data');
    }

    try {
        const pool = await sql.connect(req.session.dbConfig);

        // Clear existing history
        await pool.request()
            .input('userId', sql.Int, userId)
            .query('DELETE FROM status_history WHERE u_id = @userId');

        // Insert new history entries
        for (const entry of history) {
            if (!entry.status || !entry.changed_at) continue;

            await pool.request()
                .input('userId', sql.Int, userId)
                .input('status', sql.VarChar(sql.MAX), entry.status)
                .input('changed_at', sql.DateTime, new Date(entry.changed_at))
                .query(`
                    INSERT INTO status_history (u_id, status, changed_at)
                    VALUES (@userId, @status, @changed_at)
                `);
        }

        res.sendStatus(200);
    } catch (err) {
        console.error('Status history update error:', err);
        res.status(500).send('Failed to update status history');
    }
});

app.get('/job/:id/status-history-json', requireDbLogin, async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    try {
        const pool = await sql.connect(req.session.dbConfig);

        const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query('SELECT status, changed_at FROM status_history WHERE u_id = @userId ORDER BY changed_at DESC');

        res.json(result.recordset);
    } catch (err) {
        console.error('Failed to get status history:', err);
        res.status(500).send('Failed to load status history');
    }
});


app.post('/bio/:id/upload-cv', requireDbLogin, upload.single('cv'), async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const file = req.file;

    if (!file || !file.buffer) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const pool = await sql.connect(req.session.dbConfig);

        await pool.request()
            .input('id', sql.Int, userId)
            .input('cv', sql.VarBinary(sql.MAX), file.buffer)
            .query(`
                UPDATE candidate_card
                SET cv = @cv
                WHERE u_id = @id
            `);

        req.session.uploadedCV = {
            filename: file.originalname,
            mimetype: file.mimetype
        };

        res.sendStatus(200);
    } catch (err) {
        console.error('CV upload error:', err);
        res.status(500).send('Database error during upload.');
    }
});


app.get('/bio/:id/download-cv', requireDbLogin, async (req, res) => {
    const userId = parseInt(req.params.id, 10);

    try {
        const pool = await sql.connect(req.session.dbConfig);

        const result = await pool.request()
            .input('id', sql.Int, userId)
            .query(`SELECT cv FROM candidate_card WHERE u_id = @id`);

        const cvBuffer = result.recordset[0]?.cv;

        if (!cvBuffer) {
            return res.status(404).send('CV not found.');
        }

        const fileTypeFromBuffer = await import('file-type').then(ft => ft.fileTypeFromBuffer);
        const fileType = await fileTypeFromBuffer(cvBuffer);

        let extension = 'bin';
        let mimeType = 'application/octet-stream';

        if (fileType) {
            extension = fileType.ext;
            mimeType = fileType.mime;
        }

        res.setHeader('Content-Disposition', `attachment; filename="cv.${extension}"`);
        res.setHeader('Content-Type', mimeType);
        res.send(cvBuffer);

    } catch (err) {
        console.error('CV download error:', err);
        res.status(500).send('Database error during download.');
    }
});

app.delete('/bio/:id/delete-cv', requireDbLogin, async (req, res) => {
    const userId = parseInt(req.params.id, 10);

    try {
        const pool = await sql.connect(req.session.dbConfig);

        await pool.request()
            .input('id', sql.Int, userId)
            .query(`
                UPDATE candidate_card
                SET cv = NULL
                WHERE u_id = @id
            `);

        res.sendStatus(200);
    } catch (err) {
        console.error('CV delete error:', err);
        res.status(500).send('Database error during deletion.');
    }
});


app.get('/candidates', requireDbLogin, async (req, res) => {
    try {
        // value normalisation
        const toArray = val => Array.isArray(val) ? val : val ? [val] : [];

        const nameArray = toArray(req.query.name);
        const locationArray = toArray(req.query.location);
        const positionArray = toArray(req.query.position);
        const statusArray = toArray(req.query.status);
        const hired = req.query.hired || '';
        const ageMin = req.query.ageMin || '';
        const ageMax = req.query.ageMax || '';

        const pool = await sql.connect(req.session.dbConfig);
        const request = pool.request();

        // dynamic WHERE conditions
        const conditions = [];

        if (nameArray.length) {
            const placeholders = nameArray.map((_, i) => `@name${i}`).join(', ');
            conditions.push(`c.name IN (${placeholders})`);
            nameArray.forEach((val, i) => request.input(`name${i}`, sql.VarChar, val));
        }

        if (locationArray.length) {
            const placeholders = locationArray.map((_, i) => `@loc${i}`).join(', ');
            conditions.push(`c.location IN (${placeholders})`);
            locationArray.forEach((val, i) => request.input(`loc${i}`, sql.VarChar, val));
        }

        if (positionArray.length) {
            const placeholders = positionArray.map((_, i) => `@pos${i}`).join(', ');
            conditions.push(`ISNULL(p.position_name, '') IN (${placeholders})`);
            positionArray.forEach((val, i) => request.input(`pos${i}`, sql.VarChar, val));
        }

        if (statusArray.length) {
            const placeholders = statusArray.map((_, i) => `@status${i}`).join(', ');
            conditions.push(`ISNULL(s.selection_status, '') IN (${placeholders})`);
            statusArray.forEach((val, i) => request.input(`status${i}`, sql.VarChar, val));
        }

        if (ageMin) {
            conditions.push(`c.age >= @ageMin`);
            request.input('ageMin', sql.Int, parseInt(ageMin));
        }

        if (ageMax) {
            conditions.push(`c.age <= @ageMax`);
            request.input('ageMax', sql.Int, parseInt(ageMax));
        }

        if (hired === 'true') {
            conditions.push(`s.job_offer = 1`);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const query = `
            SELECT 
                c.u_id,
                c.name,
                c.surname,
                c.contact_date,
                c.age,
                s.interview_date,
                s.selection_status,
                s.job_offer,
                p.position_name
            FROM candidate_card c
            LEFT JOIN selection_card s ON c.u_id = s.u_id
            LEFT JOIN s_positions p ON s.pos_id = p.pos_id
            ${whereClause}
            ORDER BY c.u_id DESC
        `;

        const [
            candidateData,
            nameOptions,
            locationOptions,
            positionOptions,
            statusOptions
        ] = await Promise.all([
            request.query(query),
            pool.request().query(`SELECT DISTINCT name FROM candidate_card WHERE name IS NOT NULL`),
            pool.request().query(`SELECT DISTINCT location FROM candidate_card WHERE location IS NOT NULL`),
            pool.request().query(`SELECT DISTINCT position_name FROM s_positions WHERE position_name IS NOT NULL`),
            pool.request().query(`SELECT DISTINCT selection_status FROM selection_card WHERE selection_status IS NOT NULL`)
        ]);

        const groupedCandidates = {};
        candidateData.recordset.forEach(c => {
            const key = c.position_name || 'Unassigned';
            if (!groupedCandidates[key]) groupedCandidates[key] = [];
            groupedCandidates[key].push(c);
        });

        res.render('candidates', {
            groupedCandidates,
            searchValue: req.query,
            filterOptions: {
                names: nameOptions.recordset.map(r => r.name),
                locations: locationOptions.recordset.map(r => r.location),
                positions: positionOptions.recordset.map(r => r.position_name),
                statuses: statusOptions.recordset.map(r => r.selection_status)
            },
            csrfToken: req.csrfToken()
        });

    } catch (err) {
        console.error('Error fetching candidates:', err);
        res.status(500).send('Failed to fetch candidates.');
    }
});

app.get('/positions', requireDbLogin, async (req, res) => {
    try {
        const search = req.query.search || '';
        const query = `
            SELECT pos_id, position_name, places_count, places_left, creation_date
            FROM s_positions
            WHERE position_name LIKE @search
        `;

        const pool = await sql.connect(req.session.dbConfig);
        const request = pool.request();
        const result = await request
            .input('search', sql.VarChar, `%${search}%`)
            .query(query);

        res.render('positions', {
            positions: result.recordset,
            searchValue: search,
            csrfToken: req.csrfToken()
        });

    } catch (err) {
        console.error('Error fetching positions:', err);
        res.status(500).send('Error fetching positions');
    }
});

