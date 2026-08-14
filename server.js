const express = require("express");
const http = require("http");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const db = require("./db");


// ========================================
// APP SETUP
// ========================================

const app = express();

const server = http.createServer(app);

const io = new Server(server);


const PORT = process.env.PORT || 3000;

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "STUDYBATTLE_SECRET_CHANGE_THIS";


// ========================================
// MIDDLEWARE
// ========================================

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);
// ========================================
// DAILY CHALLENGE DATABASE TABLES
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS daily_challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        challenge_date TEXT NOT NULL UNIQUE,
        question_ids TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_challenge_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        challenge_date TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        xp_earned INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, challenge_date)
    );
`);


// ========================================
// AUTHENTICATION FUNCTIONS
// ========================================

function createToken(user) {

    return jwt.sign(
        {
            id: user.id,
            email: user.email
        },
        JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );

}


function authenticateToken(req, res, next) {

    const header =
        req.headers.authorization;


    if (!header) {

        return res.status(401).json({
            message: "Authentication required"
        });

    }


    const token =
        header.split(" ")[1];


    try {

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );


        req.user =
            decoded;


        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired token"
        });

    }

}


// ========================================
// REGISTER
// ========================================

app.post(
    "/api/register",
    async (req, res) => {

        try {

            const {
                name,
                email,
                password,
                college,
                branch
            } = req.body;


            if (
                !name ||
                !email ||
                !password ||
                !college ||
                !branch
            ) {

                return res.status(400).json({
                    message:
                        "All fields are required"
                });

            }


            if (password.length < 6) {

                return res.status(400).json({
                    message:
                        "Password must contain at least 6 characters"
                });

            }


            const existingUser =
                db.prepare(
                    "SELECT id FROM users WHERE email = ?"
                ).get(email);


            if (existingUser) {

                return res.status(409).json({
                    message:
                        "Email already registered"
                });

            }


            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );


            const result =
                db.prepare(`
                    INSERT INTO users
                    (
                        name,
                        email,
                        password,
                        college,
                        branch
                    )
                    VALUES (?, ?, ?, ?, ?)
                `).run(
                    name,
                    email,
                    hashedPassword,
                    college,
                    branch
                );


            const user =
                db.prepare(
                    "SELECT * FROM users WHERE id = ?"
                ).get(result.lastInsertRowid);


            const token =
                createToken(user);


            res.json({

                token,

                user: {

                    id: user.id,
                    name: user.name,
                    email: user.email,
                    college: user.college,
                    branch: user.branch,
                    xp: user.xp,
                    level: user.level,
                    battles: user.battles,
                    wins: user.wins,
                    streak: user.streak

                }

            });


        } catch (error) {

            console.error(error);

            res.status(500).json({
                message:
                    "Registration failed"
            });

        }

    }
);


// ========================================
// LOGIN
// ========================================

app.post(
    "/api/login",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;


            const user =
                db.prepare(
                    "SELECT * FROM users WHERE email = ?"
                ).get(email);


            if (!user) {

                return res.status(401).json({
                    message:
                        "Invalid email or password"
                });

            }


            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (!passwordMatch) {

                return res.status(401).json({
                    message:
                        "Invalid email or password"
                });

            }


            const token =
                createToken(user);


            res.json({

                token,

                user: {

                    id: user.id,
                    name: user.name,
                    email: user.email,
                    college: user.college,
                    branch: user.branch,
                    xp: user.xp,
                    level: user.level,
                    battles: user.battles,
                    wins: user.wins,
                    streak: user.streak

                }

            });


        } catch (error) {

            console.error(error);

            res.status(500).json({
                message:
                    "Login failed"
            });

        }

    }
);


// ========================================
// GET CURRENT USER
// ========================================

app.get(
    "/api/me",
    authenticateToken,
    (req, res) => {

        const user =
            db.prepare(`
                SELECT
                    id,
                    name,
                    email,
                    college,
                    branch,
                    xp,
                    level,
                    battles,
                    wins,
                    streak
                FROM users
                WHERE id = ?
            `).get(req.user.id);


        if (!user) {

            return res.status(404).json({
                message: "User not found"
            });

        }


        res.json({
            user
        });

    }
);


// ========================================
// LEADERBOARD
// ========================================

app.get(
    "/api/leaderboard",
    (req, res) => {

        const users =
            db.prepare(`
                SELECT
                    id,
                    name,
                    college,
                    branch,
                    xp,
                    level,
                    battles,
                    wins
                FROM users
                ORDER BY xp DESC
                LIMIT 50
            `).all();


        res.json({
            users
        });

    }
);


// ========================================
// QUESTION API
// ========================================

app.get(
    "/api/questions",
    authenticateToken,
    (req, res) => {

        const questions =
            db.prepare(`
                SELECT
                    id,
                    subject,
                    difficulty,
                    question,
                    options
                FROM questions
                ORDER BY RANDOM()
                LIMIT 10
            `).all();


        const formatted =
            questions.map(
                q => ({

                    id: q.id,

                    subject:
                        q.subject,

                    difficulty:
                        q.difficulty,

                    question:
                        q.question,

                    options:
                        JSON.parse(
                            q.options
                        )

                })
            );


        res.json({
            questions: formatted
        });

    }
);
// ========================================
// DAILY CHALLENGE API
// ========================================

function getTodayDate() {
    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "Asia/Kolkata"
        }
    ).format(new Date());
}


// ----------------------------------------
// GET DAILY CHALLENGE
// ----------------------------------------

// ============================================
// GET DAILY CHALLENGE
// ============================================

app.get(
    "/api/daily-challenge",
    authenticateToken,
    (req, res) => {

        try {

            const today = getTodayDate();

            // --------------------------------------------
            // 1. Check whether today's challenge exists
            // --------------------------------------------

            let challenge = db.prepare(`
                SELECT *
                FROM daily_challenges
                WHERE challenge_date = ?
            `).get(today);


            // --------------------------------------------
            // 2. Create today's challenge if needed
            // --------------------------------------------

            if (!challenge) {

                const questions = db.prepare(`
                    SELECT id
                    FROM questions
                    ORDER BY RANDOM()
                    LIMIT 10
                `).all();


                if (!questions || questions.length < 10) {

                    return res.status(400).json({
                        success: false,
                        message: "Not enough questions in database"
                    });

                }


                const questionIds = questions.map(
                    q => q.id
                );


                db.prepare(`
                    INSERT INTO daily_challenges
                    (
                        challenge_date,
                        question_ids
                    )
                    VALUES (?, ?)
                `).run(
                    today,
                    JSON.stringify(questionIds)
                );


                // Get the newly created challenge

                challenge = db.prepare(`
                    SELECT *
                    FROM daily_challenges
                    WHERE challenge_date = ?
                `).get(today);

            }


            // --------------------------------------------
            // 3. Make sure challenge exists
            // --------------------------------------------

            if (!challenge) {

                return res.status(500).json({
                    success: false,
                    message: "Unable to create daily challenge"
                });

            }


            // --------------------------------------------
            // 4. Read question IDs
            // --------------------------------------------

            let questionIds;

            try {

                questionIds = JSON.parse(
                    challenge.question_ids
                );

            } catch (error) {

                console.error(
                    "Invalid question_ids:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    message: "Invalid daily challenge data"
                });

            }


            if (
                !Array.isArray(questionIds) ||
                questionIds.length === 0
            ) {

                return res.status(500).json({
                    success: false,
                    message: "Daily challenge has no questions"
                });

            }


            // --------------------------------------------
            // 5. Get the actual questions
            // --------------------------------------------

            const placeholders = questionIds
                .map(() => "?")
                .join(",");


            const questions = db.prepare(`
                SELECT
                    id,
                    subject,
                    difficulty,
                    question,
                    options,
                   correct_index
                FROM questions
                WHERE id IN (${placeholders})
            `).all(
                ...questionIds
            );


            if (!questions || questions.length === 0) {

                return res.status(500).json({
                    success: false,
                    message: "No questions found"
                });

            }


            // --------------------------------------------
            // 6. Format questions
            // --------------------------------------------

            const formatted = questions.map(q => {

                let options = [];

                try {

                    options = JSON.parse(q.options);

                } catch (error) {

                    console.error(
                        "Invalid options for question:",
                        q.id
                    );

                    options = [];
                }


                return {

                    id: q.id,

                    subject: q.subject,

                    difficulty: q.difficulty,

                    question: q.question,

                    options: options,

                    correctIndex: q.correct_index

};
            });


            // --------------------------------------------
            // 7. Check whether user completed today's challenge
            // --------------------------------------------

            let completed = null;

            try {

                completed = db.prepare(`
                    SELECT id
                    FROM daily_challenge_attempts
                    WHERE user_id = ?
                    AND challenge_date = ?
                `).get(
                    req.user.id,
                    today
                );

            } catch (error) {

                console.error(
                    "Could not check challenge attempt:",
                    error
                );

                completed = null;
            }


            // --------------------------------------------
            // 8. Send JSON response
            // --------------------------------------------

            return res.json({

                success: true,

                date: today,

                completed: !!completed,

                questions: formatted

            });

        }


        // --------------------------------------------
        // ERROR HANDLER
        // --------------------------------------------

        catch (error) {

            console.error(
                "Daily challenge error:",
                error
            );


            return res.status(500).json({

                success: false,

                message: "Failed to load daily challenge",

                error: error.message

            });

        }

    }
);

// ----------------------------------------
// COMPLETE DAILY CHALLENGE
// ----------------------------------------

app.post(
    "/api/daily-challenge/complete",
    authenticateToken,
    (req, res) => {

        try {

            const {
                answers
            } = req.body;


            if (
                !Array.isArray(answers)
            ) {

                return res.status(400).json({
                    message:
                        "Answers are required"
                });

            }


            const today =
                getTodayDate();


            const challenge =
                db.prepare(`
                    SELECT *
                    FROM daily_challenges
                    WHERE challenge_date = ?
                `).get(today);


            if (!challenge) {

                return res.status(404).json({
                    message:
                        "Today's challenge not found"
                });

            }


            const alreadyCompleted =
                db.prepare(`
                    SELECT id
                    FROM daily_challenge_attempts
                    WHERE user_id = ?
                    AND challenge_date = ?
                `).get(
                    req.user.id,
                    today
                );


            if (alreadyCompleted) {

                return res.status(409).json({
                    message:
                        "Daily challenge already completed today"
                });

            }


            const questionIds =
                JSON.parse(
                    challenge.question_ids
                );


            let score = 0;


            for (
                const answer of answers
            ) {

                const question =
                    db.prepare(`
                        SELECT
                            correct_index
                        FROM questions
                        WHERE id = ?
                    `).get(
                        answer.questionId
                    );


                if (!question) {
                    continue;
                }


                if (
                    Number(
                        answer.answer
                    ) ===
                    Number(
                        question.correct_index
                    )
                ) {

                    score++;

                }

            }


            // Daily Challenge bonus
            const xpEarned = 50;


            db.prepare(`
                INSERT INTO daily_challenge_attempts
                (
                    user_id,
                    challenge_date,
                    score,
                    xp_earned
                )
                VALUES (?, ?, ?, ?)
            `).run(
                req.user.id,
                today,
                score,
                xpEarned
            );


            // Update user XP
            db.prepare(`
                UPDATE users
                SET
                    xp = xp + ?,
                    level =
                        CAST(
                            (xp + ?) / 500
                            AS INTEGER
                        ) + 1
                WHERE id = ?
            `).run(
                xpEarned,
                xpEarned,
                req.user.id
            );


            const user =
                db.prepare(`
                    SELECT
                        id,
                        name,
                        email,
                        college,
                        branch,
                        xp,
                        level,
                        battles,
                        wins,
                        streak
                    FROM users
                    WHERE id = ?
                `).get(
                    req.user.id
                );


            res.json({

                success: true,

                message:
                    "Daily challenge completed!",

                score,

                total:
                    questionIds.length,

                xpEarned,

                user

            });

        } catch (error) {

            console.error(
                "Daily challenge completion error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to complete daily challenge"
            });

        }

    }
);

// ========================================
// SOCKET.IO AUTHENTICATION
// ========================================

io.use(
    (socket, next) => {

        try {

            const token =
                socket.handshake.auth.token;


            if (!token) {

                return next(
                    new Error(
                        "Authentication required"
                    )
                );

            }


            const decoded =
                jwt.verify(
                    token,
                    JWT_SECRET
                );


            const user =
                db.prepare(
                    "SELECT * FROM users WHERE id = ?"
                ).get(decoded.id);


            if (!user) {

                return next(
                    new Error(
                        "User not found"
                    )
                );

            }


            socket.user = user;


            next();

        } catch (error) {

            next(
                new Error(
                    "Invalid authentication"
                )
            );

        }

    }
);


// ========================================
// MATCHMAKING
// ========================================

const waitingPlayers = [];

const activeBattles = new Map();


function removeFromQueue(socketId) {

    const index =
        waitingPlayers.indexOf(
            socketId
        );


    if (index !== -1) {

        waitingPlayers.splice(
            index,
            1
        );

    }

}


function getRandomQuestions() {

    return db.prepare(`
        SELECT
            id,
            subject,
            difficulty,
            question,
            options,
            correct_index
        FROM questions
        ORDER BY RANDOM()
        LIMIT 10
    `).all();

}


function createBattle(
    socketA,
    socketB
) {

    const questions =
        getRandomQuestions();


    if (questions.length < 10) {

        socketA.emit(
            "battle:error",
            {
                message:
                    "Not enough questions in database"
            }
        );

        socketB.emit(
            "battle:error",
            {
                message:
                    "Not enough questions in database"
            }
        );

        return;

    }


    const battleResult =
        db.prepare(
            "INSERT INTO battles DEFAULT VALUES"
        ).run();


    const battleId =
        Number(
            battleResult.lastInsertRowid
        );


    db.prepare(`
        INSERT INTO battle_players
        (
            battle_id,
            user_id
        )
        VALUES (?, ?)
    `).run(
        battleId,
        socketA.user.id
    );


    db.prepare(`
        INSERT INTO battle_players
        (
            battle_id,
            user_id
        )
        VALUES (?, ?)
    `).run(
        battleId,
        socketB.user.id
    );


    const room =
        "battle_" + battleId;


    socketA.join(room);

    socketB.join(room);


    const battle = {

        id: battleId,

        room,

        players: {

            [socketA.id]: {
                userId: socketA.user.id,
                score: 0,
                answered: false,
                answer: null
            },

            [socketB.id]: {
                userId: socketB.user.id,
                score: 0,
                answered: false,
                answer: null
            }

        },

        questions,

        currentQuestion: 0,

        timer: null,

        started: false

    };


    activeBattles.set(
        battleId,
        battle
    );


    socketA.emit(
        "battle:matched",
        {
            opponent: {
                name: socketB.user.name,
                college: socketB.user.college
            }
        }
    );


    socketB.emit(
        "battle:matched",
        {
            opponent: {
                name: socketA.user.name,
                college: socketA.user.college
            }
        }
    );


    setTimeout(
        () => {

            startQuestion(
                battleId
            );

        },
        1500
    );

}


function startQuestion(
    battleId
) {

    const battle =
        activeBattles.get(
            battleId
        );


    if (!battle) {
        return;
    }


    if (
        battle.currentQuestion >=
        battle.questions.length
    ) {

        finishBattle(
            battleId
        );

        return;

    }


    const question =
        battle.questions[
            battle.currentQuestion
        ];


    Object.values(
        battle.players
    ).forEach(
        player => {

            player.answered =
                false;

            player.answer =
                null;

        }
    );


    battle.started =
        true;


    const duration =
        6000;


    const deadline =
        Date.now() + duration;


    io.to(
        battle.room
    ).emit(
        "battle:question",
        {

            number:
                battle.currentQuestion + 1,

            total:
                battle.questions.length,

            question: {

                id: question.id,

                subject:
                    question.subject,

                difficulty:
                    question.difficulty,

                text:
                    question.question,

                options:
                    JSON.parse(
                        question.options
                    )

            },

            deadline

        }
    );


    clearTimeout(
        battle.timer
    );


    battle.timer =
        setTimeout(
            () => {

                resolveQuestion(
                    battleId
                );

            },
            duration
        );

}


function resolveQuestion(
    battleId
) {

    const battle =
        activeBattles.get(
            battleId
        );


    if (!battle) {
        return;
    }


    const question =
        battle.questions[
            battle.currentQuestion
        ];


    const correctIndex =
        question.correct_index;


    Object.entries(
        battle.players
    ).forEach(
        ([socketId, player]) => {

            if (
                player.answer !== null &&
                player.answer ===
                    correctIndex
            ) {

                player.score += 100;

            }

        }
    );


    const scores = {};


    Object.entries(
        battle.players
    ).forEach(
        ([socketId, player]) => {

            scores[socketId] =
                player.score;

        }
    );


    io.to(
        battle.room
    ).emit(
        "battle:result",
        {

            correctIndex,

            scores

        }
    );


    battle.currentQuestion++;


    if (
        battle.currentQuestion >=
        battle.questions.length
    ) {

        setTimeout(
            () => {

                finishBattle(
                    battleId
                );

            },
            1500
        );

    } else {

        setTimeout(
            () => {

                startQuestion(
                    battleId
                );

            },
            1500
        );

    }

}


function finishBattle(
    battleId
) {

    const battle =
        activeBattles.get(
            battleId
        );


    if (!battle) {
        return;
    }


    clearTimeout(
        battle.timer
    );


    const playerEntries =
        Object.entries(
            battle.players
        );


    let highestScore = -1;


    playerEntries.forEach(
        ([socketId, player]) => {

            if (
                player.score >
                highestScore
            ) {

                highestScore =
                    player.score;

            }

        }
    );


    playerEntries.forEach(
        ([socketId, player]) => {

            const result =
                player.score >
                highestScore
                    ? "win"
                    : player.score ===
                      highestScore
                        ? "draw"
                        : "loss";


            const xp =
                result === "win"
                    ? 150
                    : result === "draw"
                        ? 75
                        : 40;


            db.prepare(`
                UPDATE battle_players
                SET
                    score = ?,
                    xp_earned = ?,
                    result = ?
                WHERE
                    battle_id = ?
                    AND user_id = ?
            `).run(
                player.score,
                xp,
                result,
                battleId,
                player.userId
            );


            if (result === "win") {

                db.prepare(`
                    UPDATE users
                    SET
                        xp = xp + ?,
                        wins = wins + 1,
                        battles = battles + 1,
                        level = CAST((xp + ?) / 500 AS INTEGER) + 1
                    WHERE id = ?
                `).run(
                    xp,
                    xp,
                    player.userId
                );

            } else {

                db.prepare(`
                    UPDATE users
                    SET
                        xp = xp + ?,
                        battles = battles + 1,
                        level = CAST((xp + ?) / 500 AS INTEGER) + 1
                    WHERE id = ?
                `).run(
                    xp,
                    xp,
                    player.userId
                );

            }

        }
    );


    const finalPlayers =
        playerEntries.map(
            ([socketId, player]) => {

                const socket =
                    io.sockets.sockets.get(
                        socketId
                    );


                const latestUser =
                    db.prepare(`
                        SELECT
                            id,
                            name,
                            college,
                            xp,
                            level,
                            battles,
                            wins
                        FROM users
                        WHERE id = ?
                    `).get(
                        player.userId
                    );


                return {

                    socketId,

                    name:
                        latestUser
                            ? latestUser.name
                            : "Player",

                    college:
                        latestUser
                            ? latestUser.college
                            : "",

                    score:
                        player.score,

                    xp:
                        latestUser
                            ? latestUser.xp
                            : 0,

                    level:
                        latestUser
                            ? latestUser.level
                            : 1

                };

            }
        );


    io.to(
        battle.room
    ).emit(
        "battle:finished",
        {
            players:
                finalPlayers
        }
    );


    activeBattles.delete(
        battleId
    );

}


io.on(
    "connection",
    socket => {

        console.log(
            "User connected:",
            socket.user.name
        );


        socket.on(
            "matchmaking:join",
            () => {

                removeFromQueue(
                    socket.id
                );


                waitingPlayers.push(
                    socket.id
                );


                socket.emit(
                    "matchmaking:waiting"
                );


                if (
                    waitingPlayers.length >=
                    2
                ) {

                    const socketAId =
                        waitingPlayers.shift();


                    const socketBId =
                        waitingPlayers.shift();


                    const socketA =
                        io.sockets.sockets.get(
                            socketAId
                        );


                    const socketB =
                        io.sockets.sockets.get(
                            socketBId
                        );


                    if (
                        socketA &&
                        socketB
                    ) {

                        createBattle(
                            socketA,
                            socketB
                        );

                    }

                }

            }
        );


        socket.on(
            "matchmaking:cancel",
            () => {

                removeFromQueue(
                    socket.id
                );

            }
        );


        socket.on(
            "battle:answer",
            data => {

                const battle =
                    Array.from(
                        activeBattles.values()
                    ).find(
                        b =>
                            b.players[
                                socket.id
                            ]
                    );


                if (!battle) {
                    return;
                }


                const player =
                    battle.players[
                        socket.id
                    ];


                if (
                    player.answered
                ) {
                    return;
                }


                player.answered =
                    true;


                player.answer =
                    Number(
                        data.answer
                    );


                const allAnswered =
                    Object.values(
                        battle.players
                    ).every(
                        p =>
                            p.answered
                    );


                if (allAnswered) {

                    clearTimeout(
                        battle.timer
                    );


                    resolveQuestion(
                        battle.id
                    );

                }

            }
        );


        socket.on(
            "disconnect",
            () => {

                removeFromQueue(
                    socket.id
                );


                const battle =
                    Array.from(
                        activeBattles.values()
                    ).find(
                        b =>
                            b.players[
                                socket.id
                            ]
                    );


                if (battle) {

                    const otherPlayer =
                        Object.keys(
                            battle.players
                        ).find(
                            id =>
                                id !== socket.id
                        );


                    if (otherPlayer) {

                        const otherSocket =
                            io.sockets.sockets.get(
                                otherPlayer
                            );


                        if (otherSocket) {

                            otherSocket.emit(
                                "battle:opponentLeft"
                            );

                        }

                    }


                    clearTimeout(
                        battle.timer
                    );


                    activeBattles.delete(
                        battle.id
                    );

                }


                console.log(
                    "User disconnected:",
                    socket.user.name
                );

            }
        );

    }
);


// ========================================
// START SERVER
// ========================================
if (!process.env.VERCEL) {
    server.listen(
        PORT,
        '0.0.0.0',
        () => {

            console.log("");
            console.log(
                "================================"
            );

            console.log(
                "      STUDYBATTLE SERVER"
            );

            console.log(
                "================================"
            );

            console.log(
                `Running at http://localhost:${PORT}`
            );

            console.log(
                "================================"
            );

            console.log("");

        }
    );
}

module.exports = server;
