const Database = require("better-sqlite3");

const db = new Database("studybattle.db");

db.pragma("journal_mode = WAL");


// ========================================
// USERS TABLE
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        college TEXT NOT NULL,
        branch TEXT NOT NULL,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        battles INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);


// ========================================
// QUESTIONS TABLE
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        difficulty INTEGER DEFAULT 3,
        question TEXT NOT NULL,
        options TEXT NOT NULL,
        correct_index INTEGER NOT NULL
    )
`);


// ========================================
// BATTLES TABLE
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS battles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);


// ========================================
// BATTLE PLAYERS TABLE
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS battle_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        battle_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        score INTEGER DEFAULT 0,
        xp_earned INTEGER DEFAULT 0,
        result TEXT,
        FOREIGN KEY(battle_id) REFERENCES battles(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
`);


// ========================================
// INSERT QUESTIONS
// ========================================

const questionCount =
    db.prepare(
        "SELECT COUNT(*) AS count FROM questions"
    ).get().count;


if (questionCount === 0) {

    const insertQuestion = db.prepare(`
        INSERT INTO questions
        (
            subject,
            difficulty,
            question,
            options,
            correct_index
        )
        VALUES (?, ?, ?, ?, ?)
    `);


    const questions = [

        [
            "Electronics",
            2,
            "Which sensor is commonly used to measure temperature?",
            JSON.stringify([
                "LM35",
                "L293D",
                "NE555",
                "74LS138"
            ]),
            0
        ],

        [
            "Electronics",
            3,
            "What is the main purpose of a capacitor in a power supply?",
            JSON.stringify([
                "Amplification",
                "Filtering",
                "Switching",
                "Oscillation"
            ]),
            1
        ],

        [
            "Electronics",
            3,
            "Which device can switch a high-power load using a low-power signal?",
            JSON.stringify([
                "Resistor",
                "Capacitor",
                "Relay",
                "LED"
            ]),
            2
        ],

        [
            "Digital Electronics",
            2,
            "Which logic gate produces HIGH only when both inputs are HIGH?",
            JSON.stringify([
                "OR",
                "NOT",
                "AND",
                "XOR"
            ]),
            2
        ],

        [
            "Digital Electronics",
            3,
            "Which flip-flop is commonly used as a frequency divider?",
            JSON.stringify([
                "D flip-flop",
                "T flip-flop",
                "SR latch",
                "None"
            ]),
            1
        ],

        [
            "Embedded Systems",
            2,
            "Which language is commonly used for microcontroller programming?",
            JSON.stringify([
                "HTML",
                "C",
                "SQL",
                "CSS"
            ]),
            1
        ],

        [
            "Embedded Systems",
            3,
            "Which protocol uses SDA and SCL?",
            JSON.stringify([
                "UART",
                "SPI",
                "I2C",
                "CAN"
            ]),
            2
        ],

        [
            "Embedded Systems",
            3,
            "What does PWM commonly control?",
            JSON.stringify([
                "Motor speed",
                "Memory size",
                "CPU architecture",
                "Compiler"
            ]),
            0
        ],

        [
            "Programming",
            2,
            "Which symbol is used to access the address of a variable in C?",
            JSON.stringify([
                "@",
                "#",
                "&",
                "$"
            ]),
            2
        ],

        [
            "Programming",
            3,
            "Which loop executes its body at least once?",
            JSON.stringify([
                "for",
                "while",
                "do-while",
                "foreach"
            ]),
            2
        ],

        [
            "Physics",
            2,
            "What happens to a superconductor below its critical temperature?",
            JSON.stringify([
                "Resistance becomes extremely high",
                "Resistance becomes zero",
                "It melts",
                "Voltage becomes zero"
            ]),
            1
        ],

        [
            "Physics",
            3,
            "Which phenomenon describes the expulsion of magnetic flux from a superconductor?",
            JSON.stringify([
                "Hall effect",
                "Meissner effect",
                "Photoelectric effect",
                "Doppler effect"
            ]),
            1
        ],

        [
            "Mathematics",
            2,
            "What is the derivative of x²?",
            JSON.stringify([
                "x",
                "2x",
                "x²",
                "2"
            ]),
            1
        ],

        [
            "Mathematics",
            3,
            "What is the value of 5 × 8?",
            JSON.stringify([
                "35",
                "40",
                "45",
                "50"
            ]),
            1
        ],

        [
            "Electronics",
            4,
            "What is the purpose of a flyback diode across a relay coil?",
            JSON.stringify([
                "Increase current",
                "Protect the switching device",
                "Increase resistance",
                "Increase temperature"
            ]),
            1
        ]

    ];


    const insertMany = db.transaction(
        (rows) => {

            for (const row of rows) {

                insertQuestion.run(...row);

            }

        }
    );


    insertMany(questions);

}


module.exports = db;