const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const helmet = require('helmet');
const sql = require('mssql'); // SQL Server library
const session = require('express-session');

const app = express();
const PORT = 3000;

// Set view engine
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

app.use(session({
    secret: 'i-dont-know-what-to-put-here', // change later
    resave: false,
    saveUninitialized: true,
    cookie: {
        sameSite: 'Strict',
        secure: process.env.NODE_ENV === 'production',
    }
}));

app.use(bodyParser.urlencoded({ extended: true }));
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



// Database config
function buildDbConfig(user, password) {
    return {
        user,
        password,
        server: 'localhost',
        database: 'db_1',
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




// Route to display records
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

// CSRF error handler
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        res.status(403).send('Forbidden - invalid CSRF token');
    } else {
        next(err);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


// Biography page
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

        // Fetch only job names from c_exp_list (remove fetching experience_summary from c_experience)
        const experienceListResult = await sql.query(`
            SELECT job_name FROM c_exp_list WHERE u_id = ${userId}
        `);

        const experienceList = experienceListResult.recordset;

        // Fetch licenses as before
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

app.use(express.json());

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

        // Clear previous jobs for this user
        await pool.request()
            .input('userId', sql.Int, userId)
            .query('DELETE FROM c_exp_list WHERE u_id = @userId');

        // Insert new job names
        for (const job of job_names) {
            if (!job) continue; // skip empty values

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

app.get('/candidates', requireDbLogin, async (req, res) => {
    try {
        const search = req.query.search || '';
        const query = `
            SELECT u_id, name, surname, age, location 
            FROM candidate_card 
            WHERE 
                name LIKE @search OR 
                surname LIKE @search OR 
                location LIKE @search
        `;

        const pool = await sql.connect(req.session.dbConfig);
        const request = pool.request();           
        const result = await request
            .input('search', sql.VarChar, `%${search}%`)
            .query(query);

        res.render('candidates', {
            users: result.recordset,
            searchValue: search
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching candidates');
    }
});

// Applications page
app.get('/applications/:id', requireDbLogin, async (req, res) => {
    const userId = req.params.id;

    try {
        await sql.connect(req.session.dbConfig);
        const applications = await sql.query(`
            SELECT 
                p.position_name,
                s.selection_status,
                s.interview_date,
                s.interview_handler,
                s.source,
                s.job_offer,
                s.candidate_decision,
                s.refusal_reason,
                s.work_start_date
            FROM selection_card s
            JOIN s_positions p ON s.pos_id = p.pos_id
            WHERE s.u_id = ${userId}
        `);

        res.render('applications', { data: applications.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).send('Database error');
    }
});