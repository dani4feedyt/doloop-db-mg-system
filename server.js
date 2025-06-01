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


app.get('/job/:id', requireDbLogin, async (req, res) => {
    const userId = parseInt(req.params.id, 10);

    try {
        await sql.connect(req.session.dbConfig);

        const result = await sql.query(`
            SELECT 
                p.position_name, s.selection_status, s.interview_date,
                s.interview_handler, s.source, s.job_offer,
                s.candidate_decision, s.refusal_reason, s.work_start_date,

                c.name, c.surname, c.age, c.location

            FROM selection_card s
            JOIN s_positions p ON s.pos_id = p.pos_id
            JOIN candidate_card c ON c.u_id = s.u_id
            WHERE s.u_id = ${userId}
        `);

        if (result.recordset.length === 0) {
            return res.status(404).send('No job selection data found for this user.');
        }

        const personInfo = {
            name: result.recordset[0].name,
            surname: result.recordset[0].surname,
            age: result.recordset[0].age,
            location: result.recordset[0].location
        };

        const jobs = result.recordset.map(({ name, surname, age, location, ...jobData }) => jobData);

        res.render('job', {
            person: personInfo,
            jobs,
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
            'refusal_reason', 'work_start_date', 'position_name'
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
            // Update position id by name
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
            // When selection_status changes, check old value and update places_left accordingly
            const oldStatusResult = await pool.request()
                .input('id', sql.Int, userId)
                .query(`SELECT selection_status, pos_id FROM selection_card WHERE u_id = @id`);

            if (oldStatusResult.recordset.length === 0) {
                return res.status(404).send('Record not found');
            }

            const oldStatus = oldStatusResult.recordset[0].selection_status;
            const pos_id = oldStatusResult.recordset[0].pos_id;

            const newStatus = value;

            // Update selection_status field first
            await pool.request()
                .input('value', sql.VarChar, newStatus)
                .input('id', sql.Int, userId)
                .query(`UPDATE selection_card SET selection_status = @value WHERE u_id = @id`);

            // If changing to Accepted, decrement places_left if places are available
            if (oldStatus !== 'Accepted' && newStatus === 'Accepted') {
                const posCheck = await pool.request()
                    .input('pos_id', sql.Int, pos_id)
                    .query(`SELECT places_left FROM s_positions WHERE pos_id = @pos_id`);

                const placesLeft = posCheck.recordset[0]?.places_left ?? 0;

                if (placesLeft <= 0) {
                    // Revert the update because no places left
                    await pool.request()
                        .input('value', sql.VarChar, oldStatus)
                        .input('id', sql.Int, userId)
                        .query(`UPDATE selection_card SET selection_status = @value WHERE u_id = @id`);

                    return res.status(400).send('No available places for this position.');
                }

                await pool.request()
                    .input('pos_id', sql.Int, pos_id)
                    .query(`UPDATE s_positions SET places_left = places_left - 1 WHERE pos_id = @pos_id`);

            // If changing from Accepted to something else, increment places_left
            } else if (oldStatus === 'Accepted' && newStatus !== 'Accepted') {
                await pool.request()
                    .input('pos_id', sql.Int, pos_id)
                    .query(`UPDATE s_positions SET places_left = places_left + 1 WHERE pos_id = @pos_id`);
            }

        } else {
            // Update any other field
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

