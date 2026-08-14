// ========================================
// STUDYBATTLE CLIENT
// ========================================


// ========================================
// GLOBAL VARIABLES
// ========================================

let token =
    localStorage.getItem(
        "studyBattleToken"
    );

let currentUser = null;

let socket = null;

let timerInterval = null;

let selectedQuestion = null;

let answered = false;


// ========================================
// DAILY CHALLENGE VARIABLES
// ========================================

let dailyChallengeQuestions = [];

let dailyChallengeAnswers = [];

let dailyChallengeIndex = 0;

let dailyChallengeScore = 0;


// ========================================
// ELEMENTS
// ========================================

const authScreen =
    document.getElementById(
        "authScreen"
    );

const appScreen =
    document.getElementById(
        "appScreen"
    );

const loginForm =
    document.getElementById(
        "loginForm"
    );

const registerForm =
    document.getElementById(
        "registerForm"
    );

const loginTab =
    document.getElementById(
        "loginTab"
    );

const registerTab =
    document.getElementById(
        "registerTab"
    );


// ========================================
// TAB SWITCHING
// ========================================

loginTab.addEventListener(
    "click",
    () => {

        loginTab.classList.add(
            "active"
        );

        registerTab.classList.remove(
            "active"
        );

        loginForm.classList.remove(
            "hidden"
        );

        registerForm.classList.add(
            "hidden"
        );

    }
);


registerTab.addEventListener(
    "click",
    () => {

        registerTab.classList.add(
            "active"
        );

        loginTab.classList.remove(
            "active"
        );

        registerForm.classList.remove(
            "hidden"
        );

        loginForm.classList.add(
            "hidden"
        );

    }
);


// ========================================
// API REQUEST HELPER
// ========================================

async function api(
    url,
    options = {}
) {

    const headers = {

        "Content-Type":
            "application/json"

    };


    if (token) {

        headers.Authorization =
            "Bearer " + token;

    }


    const response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );


    // ----------------------------------------
    // Read response as TEXT first
    // ----------------------------------------

    const text =
        await response.text();


    let data;


    // ----------------------------------------
    // Convert response to JSON safely
    // ----------------------------------------

    try {

        data =
            JSON.parse(text);

    } catch (error) {

        console.error(
            "Non-JSON server response:",
            text
        );

        console.error(
            "Requested URL:",
            url
        );

        console.error(
            "HTTP status:",
            response.status
        );


        throw new Error(
            "Server returned HTML instead of JSON. " +
            "API route: " +
            url +
            " | Status: " +
            response.status
        );

    }


    // ----------------------------------------
    // Handle HTTP errors
    // ----------------------------------------

    if (!response.ok) {

        throw new Error(
            data.message ||
            "Something went wrong"
        );

    }


    return data;

}


// ========================================
// LOGIN
// ========================================

loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const email =
            document.getElementById(
                "loginEmail"
            ).value;


        const password =
            document.getElementById(
                "loginPassword"
            ).value;


        const message =
            document.getElementById(
                "loginMessage"
            );


        try {

            message.textContent =
                "Logging in...";


            const data =
                await api(
                    "/api/login",
                    {

                        method:
                            "POST",

                        body:
                            JSON.stringify({
                                email,
                                password
                            })

                    }
                );


            token =
                data.token;


            localStorage.setItem(
                "studyBattleToken",
                token
            );


            currentUser =
                data.user;


            openApp();


        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            message.textContent =
                error.message;

        }

    }
);


// ========================================
// REGISTER
// ========================================

registerForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const name =
            document.getElementById(
                "registerName"
            ).value;


        const email =
            document.getElementById(
                "registerEmail"
            ).value;


        const password =
            document.getElementById(
                "registerPassword"
            ).value;


        const college =
            document.getElementById(
                "registerCollege"
            ).value;


        const branch =
            document.getElementById(
                "registerBranch"
            ).value;


        const message =
            document.getElementById(
                "registerMessage"
            );


        try {

            message.textContent =
                "Creating account...";


            const data =
                await api(
                    "/api/register",
                    {

                        method:
                            "POST",

                        body:
                            JSON.stringify({

                                name,
                                email,
                                password,
                                college,
                                branch

                            })

                    }
                );


            token =
                data.token;


            localStorage.setItem(
                "studyBattleToken",
                token
            );


            currentUser =
                data.user;


            openApp();


        } catch (error) {

            console.error(
                "Registration error:",
                error
            );


            message.textContent =
                error.message;

        }

    }
);


// ========================================
// OPEN APP
// ========================================

async function openApp() {

    authScreen.classList.add(
        "hidden"
    );


    appScreen.classList.remove(
        "hidden"
    );


    await loadUser();


    await loadLeaderboard();


    connectSocket();

}


// ========================================
// LOAD USER
// ========================================

async function loadUser() {

    try {

        const data =
            await api(
                "/api/me"
            );


        currentUser =
            data.user;


        updateUI();


    } catch (error) {

        console.error(
            "Load user error:",
            error
        );


        logout();

    }

}


// ========================================
// UPDATE UI
// ========================================

function updateUI() {

    if (!currentUser) {

        return;

    }


    document.getElementById(
        "welcomeName"
    ).textContent =
        currentUser.name;


    document.getElementById(
        "profileText"
    ).textContent =
        `${currentUser.college} · ${currentUser.branch} · Level ${currentUser.level}`;


    document.getElementById(
        "totalXP"
    ).textContent =
        currentUser.xp;


    document.getElementById(
        "levelValue"
    ).textContent =
        currentUser.level;


    document.getElementById(
        "battleCount"
    ).textContent =
        currentUser.battles;


    const winRate =
        currentUser.battles === 0

            ? 0

            : Math.round(
                (
                    currentUser.wins /
                    currentUser.battles
                ) * 100
            );


    document.getElementById(
        "winRate"
    ).textContent =
        winRate + "%";


    document.getElementById(
        "navXP"
    ).textContent =
        currentUser.xp + " XP";


    document.getElementById(
        "navLevel"
    ).textContent =
        "LV " +
        currentUser.level;


    document.getElementById(
        "collegeDisplay"
    ).textContent =
        "College: " +
        currentUser.college;


    document.getElementById(
        "branchDisplay"
    ).textContent =
        "Branch: " +
        currentUser.branch;

}


// ========================================
// SOCKET.IO CONNECTION
// ========================================

function connectSocket() {

    if (socket) {

        socket.disconnect();

    }


    socket =
        io(
            {
                auth: {
                    token
                }
            }
        );


    socket.on(
        "connect",
        () => {

            console.log(
                "Connected to StudyBattle server"
            );

        }
    );


    socket.on(
        "connect_error",
        error => {

            console.error(
                "Socket connection error:",
                error.message
            );

        }
    );


    socket.on(
        "matchmaking:waiting",
        () => {

            document
                .getElementById(
                    "matchStatus"
                )
                .textContent =
                "⚡ Searching for another student...";


            document
                .getElementById(
                    "findOpponent"
                )
                .classList.add(
                    "hidden"
                );


            document
                .getElementById(
                    "cancelMatch"
                )
                .classList.remove(
                    "hidden"
                );

        }
    );


    socket.on(
        "battle:matched",
        data => {

            document
                .getElementById(
                    "battleModal"
                )
                .classList.remove(
                    "hidden"
                );


            document
                .getElementById(
                    "opponentName"
                )
                .textContent =
                data.opponent.name;


            document
                .getElementById(
                    "battlePlayerName"
                )
                .textContent =
                currentUser.name;


            document
                .getElementById(
                    "matchStatus"
                )
                .textContent =
                "Opponent found!";


            document
                .getElementById(
                    "findOpponent"
                )
                .classList.remove(
                    "hidden"
                );


            document
                .getElementById(
                    "cancelMatch"
                )
                .classList.add(
                    "hidden"
                );

        }
    );


    socket.on(
        "battle:question",
        data => {

            showQuestion(
                data
            );

        }
    );


    socket.on(
        "battle:result",
        data => {

            showQuestionResult(
                data
            );

        }
    );


    socket.on(
        "battle:finished",
        data => {

            finishBattleScreen(
                data
            );

        }
    );


    socket.on(
        "battle:opponentLeft",
        () => {

            alert(
                "Your opponent left the battle."
            );


            closeBattle();

        }
    );


    socket.on(
        "battle:error",
        data => {

            alert(
                data.message
            );


            closeBattle();

        }
    );

}


// ========================================
// FIND OPPONENT
// ========================================

document
    .getElementById(
        "findOpponent"
    )
    .addEventListener(
        "click",
        () => {

            if (!socket) {

                alert(
                    "Server connection not ready."
                );

                return;

            }


            socket.emit(
                "matchmaking:join"
            );

        }
    );


// ========================================
// CANCEL MATCH
// ========================================

document
    .getElementById(
        "cancelMatch"
    )
    .addEventListener(
        "click",
        () => {

            if (socket) {

                socket.emit(
                    "matchmaking:cancel"
                );

            }


            document
                .getElementById(
                    "matchStatus"
                )
                .textContent =
                "";


            document
                .getElementById(
                    "findOpponent"
                )
                .classList.remove(
                    "hidden"
                );


            document
                .getElementById(
                    "cancelMatch"
                )
                .classList.add(
                    "hidden"
                );

        }
    );


// ========================================
// SHOW QUESTION
// ========================================

function showQuestion(data) {

    selectedQuestion =
        data;


    answered =
        false;


    document
        .getElementById(
            "questionNumber"
        )
        .textContent =
        data.number;


    document
        .getElementById(
            "questionSubject"
        )
        .textContent =
        data.question.subject;


    document
        .getElementById(
            "questionText"
        )
        .textContent =
        data.question.text;


    document
        .getElementById(
            "battleMessage"
        )
        .textContent =
        "";


    const answers =
        document.getElementById(
            "answers"
        );


    answers.innerHTML =
        "";


    data.question.options.forEach(
        (option, index) => {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "answer";


            button.textContent =
                option;


            button.addEventListener(
                "click",
                () => {

                    answerQuestion(
                        index,
                        button
                    );

                }
            );


            answers.appendChild(
                button
            );

        }
    );


    startTimer(
        data.deadline
    );

}


// ========================================
// TIMER
// ========================================

function startTimer(
    deadline
) {

    clearInterval(
        timerInterval
    );


    function updateTimer() {

        const remaining =
            Math.max(
                0,
                deadline - Date.now()
            );


        const seconds =
            Math.ceil(
                remaining / 1000
            );


        document
            .getElementById(
                "battleTimer"
            )
            .textContent =
            seconds;


        if (
            remaining <= 0
        ) {

            clearInterval(
                timerInterval
            );

        }

    }


    updateTimer();


    timerInterval =
        setInterval(
            updateTimer,
            100
        );

}


// ========================================
// ANSWER QUESTION
// ========================================

function answerQuestion(
    index,
    clickedButton
) {

    if (answered) {

        return;

    }


    answered =
        true;


    const buttons =
        document.querySelectorAll(
            ".answer"
        );


    buttons.forEach(
        button => {

            button.disabled =
                true;

        }
    );


    clickedButton.classList.add(
        "selected"
    );


    if (socket) {

        socket.emit(
            "battle:answer",
            {
                answer: index
            }
        );

    }


    document
        .getElementById(
            "battleMessage"
        )
        .textContent =
        "Answer submitted. Waiting for opponent...";

}


// ========================================
// QUESTION RESULT
// ========================================

function showQuestionResult(
    data
) {

    const buttons =
        document.querySelectorAll(
            ".answer"
        );


    buttons.forEach(
        (button, index) => {

            if (
                index ===
                data.correctIndex
            ) {

                button.classList.add(
                    "correct"
                );

            }

        }
    );


    document
        .getElementById(
            "battleMessage"
        )
        .textContent =
        "Correct answer revealed!";

}


// ========================================
// FINISH BATTLE
// ========================================

function finishBattleScreen(
    data
) {

    clearInterval(
        timerInterval
    );


    const me =
        data.players.find(
            player =>
                player.name ===
                currentUser.name
        );


    const opponent =
        data.players.find(
            player =>
                player.name !==
                currentUser.name
        );


    let message =
        "Battle complete!";


    if (me && opponent) {

        if (
            me.score >
            opponent.score
        ) {

            message =
                `🏆 VICTORY!\n\nScore: ${me.score}\nXP: ${me.xp}`;

        } else if (
            me.score <
            opponent.score
        ) {

            message =
                `⚔ DEFEAT\n\nScore: ${me.score}\nXP: ${me.xp}`;

        } else {

            message =
                `🤝 DRAW\n\nScore: ${me.score}\nXP: ${me.xp}`;

        }

    }


    alert(
        message
    );


    closeBattle();


    loadUser();


    loadLeaderboard();

}


// ========================================
// CLOSE BATTLE
// ========================================

function closeBattle() {

    clearInterval(
        timerInterval
    );


    document
        .getElementById(
            "battleModal"
        )
        .classList.add(
            "hidden"
        );


    document
        .getElementById(
            "matchStatus"
        )
        .textContent =
        "";


    document
        .getElementById(
            "findOpponent"
        )
        .classList.remove(
            "hidden"
        );


    document
        .getElementById(
            "cancelMatch"
        )
        .classList.add(
            "hidden"
        );

}


// ========================================
// LEADERBOARD
// ========================================

async function loadLeaderboard() {

    try {

        const data =
            await api(
                "/api/leaderboard"
            );


        const container =
            document.getElementById(
                "leaderboardRows"
            );


        container.innerHTML =
            "";


        data.users.forEach(
            (user, index) => {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "leader-row";


                if (
                    currentUser &&
                    user.id ===
                    currentUser.id
                ) {

                    row.classList.add(
                        "me"
                    );

                }


                row.innerHTML = `

                    <span>
                        ${index + 1}
                    </span>

                    <strong>
                        ${escapeHtml(
                            user.name
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            user.college
                        )}
                    </span>

                    <span>
                        ${user.xp}
                    </span>

                    <span>
                        LV ${user.level}
                    </span>

                `;


                container.appendChild(
                    row
                );

            }
        );


    } catch (error) {

        console.error(
            "Leaderboard error:",
            error
        );

    }

}


// ========================================
// NAVIGATION
// ========================================

document
    .querySelectorAll(
        ".nav-btn"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".nav-btn"
                        )
                        .forEach(
                            btn =>
                                btn.classList.remove(
                                    "active"
                                )
                        );


                    button.classList.add(
                        "active"
                    );


                    document
                        .querySelectorAll(
                            ".page"
                        )
                        .forEach(
                            page =>
                                page.classList.add(
                                    "hidden"
                                )
                        );


                    const page =
                        document.getElementById(
                            button.dataset.page +
                            "Page"
                        );


                    if (page) {

                        page.classList.remove(
                            "hidden"
                        );

                    }


                    if (
                        button.dataset.page ===
                        "leaderboard"
                    ) {

                        loadLeaderboard();

                    }

                }
            );

        }
    );


// ========================================
// LOGOUT
// ========================================

document
    .getElementById(
        "logoutButton"
    )
    .addEventListener(
        "click",
        logout
    );


function logout() {

    if (socket) {

        socket.disconnect();

    }


    localStorage.removeItem(
        "studyBattleToken"
    );


    token =
        null;


    currentUser =
        null;


    location.reload();

}


// ========================================
// HTML ESCAPE
// ========================================

function escapeHtml(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text;


    return div.innerHTML;

}


// ========================================
// DAILY CHALLENGE
// ========================================

function createDailyChallengeUI() {

    const cards =
        document.querySelectorAll(
            ".info-card"
        );


    let dailyCard =
        null;


    cards.forEach(
        card => {

            const heading =
                card.querySelector(
                    "h2"
                );


            if (
                heading &&
                heading.textContent
                    .toLowerCase()
                    .includes(
                        "daily challenge"
                    )
            ) {

                dailyCard =
                    card;

            }

        }
    );


    if (!dailyCard) {

        console.warn(
            "Daily Challenge card was not found."
        );

        return;

    }


    if (
        document.getElementById(
            "dailyChallengeButton"
        )
    ) {

        return;

    }


    const button =
        document.createElement(
            "button"
        );


    button.id =
        "dailyChallengeButton";


    button.type =
        "button";


    button.textContent =
        "🔥 START DAILY CHALLENGE";


    button.style.marginTop =
        "16px";


    button.style.padding =
        "12px 20px";


    button.style.border =
        "none";


    button.style.borderRadius =
        "10px";


    button.style.cursor =
        "pointer";


    button.style.fontWeight =
        "700";


    button.addEventListener(
        "click",
        openDailyChallenge
    );


    dailyCard.appendChild(
        button
    );

}


// ========================================
// OPEN DAILY CHALLENGE
// ========================================

function openDailyChallenge() {

    if (!currentUser) {

        alert(
            "Please login first."
        );

        return;

    }


    if (!token) {

        alert(
            "Your login session has expired. Please login again."
        );

        return;

    }


    loadDailyChallenge();

}


// ========================================
// LOAD DAILY CHALLENGE
// ========================================

async function loadDailyChallenge() {

    console.log(
        "================================"
    );


    console.log(
        "Loading Daily Challenge..."
    );


    console.log(
        "Token exists:",
        !!token
    );


    console.log(
        "================================"
    );


    try {

        const data =
            await api(
                "/api/daily-challenge"
            );


        console.log(
            "Daily Challenge response:",
            data
        );


        if (data.completed) {

            alert(
                "🎉 You have already completed today's Daily Challenge!"
            );

            return;

        }


        if (
            !Array.isArray(
                data.questions
            )
        ) {

            throw new Error(
                "Server did not return a valid questions array."
            );

        }


        if (
            data.questions.length === 0
        ) {

            throw new Error(
                "No Daily Challenge questions are available."
            );

        }


        dailyChallengeQuestions =
            data.questions;


        dailyChallengeAnswers =
            [];


        dailyChallengeIndex =
            0;


        dailyChallengeScore =
            0;


        showDailyChallengeQuestion();


    } catch (error) {

        console.error(
            "================================"
        );


        console.error(
            "DAILY CHALLENGE ERROR:",
            error
        );


        console.error(
            "================================"
        );


        alert(
            "Daily Challenge could not be loaded.\n\n" +
            error.message
        );

    }

}


// ========================================
// SHOW DAILY CHALLENGE QUESTION
// ========================================

function showDailyChallengeQuestion() {

    const oldModal =
        document.getElementById(
            "dailyChallengeModal"
        );

    if (oldModal) {
        oldModal.remove();
    }

    const question =
        dailyChallengeQuestions[
            dailyChallengeIndex
        ];
        console.log(
    "DAILY QUESTION:",
    question
);

console.log(
    "CORRECT INDEX:",
    question.correctIndex
);

    if (!question) {
        alert("Question could not be loaded.");
        return;
    }

    // ========================================
    // MODAL
    // ========================================

    const modal =
        document.createElement("div");

    modal.id =
        "dailyChallengeModal";

    modal.style.position =
        "fixed";

    modal.style.inset =
        "0";

    modal.style.background =
        "rgba(10, 15, 35, 0.82)";

    modal.style.backdropFilter =
        "blur(8px)";

    modal.style.display =
        "flex";

    modal.style.alignItems =
        "center";

    modal.style.justifyContent =
        "center";

    modal.style.zIndex =
        "99999";

    modal.style.padding =
        "20px";

    modal.style.boxSizing =
        "border-box";


    // ========================================
    // MAIN BOX
    // ========================================

    const box =
        document.createElement("div");

    box.style.width =
        "min(700px, 100%)";

    box.style.maxHeight =
        "90vh";

    box.style.overflowY =
        "auto";

    box.style.background =
        "linear-gradient(145deg, #ffffff, #f4f7ff)";

    box.style.borderRadius =
        "24px";

    box.style.padding =
        "32px";

    box.style.boxSizing =
        "border-box";

    box.style.boxShadow =
        "0 25px 70px rgba(0,0,0,0.35)";

    box.style.color =
        "#172033";


    // ========================================
    // HEADER
    // ========================================

    const header =
        document.createElement("div");

    header.style.display =
        "flex";

    header.style.justifyContent =
        "space-between";

    header.style.alignItems =
        "center";

    header.style.marginBottom =
        "20px";


    const title =
        document.createElement("h2");

    title.textContent =
        "🔥 Daily Challenge";

    title.style.margin =
        "0";

    title.style.color =
        "#172033";

    title.style.fontSize =
        "28px";

    title.style.fontWeight =
        "800";


    header.appendChild(title);


    const closeButton =
        document.createElement("button");

    closeButton.textContent =
        "✕";

    closeButton.type =
        "button";

    closeButton.style.border =
        "none";

    closeButton.style.background =
        "#eef1f7";

    closeButton.style.color =
        "#172033";

    closeButton.style.width =
        "38px";

    closeButton.style.height =
        "38px";

    closeButton.style.borderRadius =
        "50%";

    closeButton.style.cursor =
        "pointer";

    closeButton.style.fontSize =
        "18px";

    closeButton.style.fontWeight =
        "700";


    closeButton.addEventListener(
        "click",
        () => {
            modal.remove();
        }
    );


    header.appendChild(
        closeButton
    );

    box.appendChild(
        header
    );


    // ========================================
    // PROGRESS
    // ========================================

    const progress =
        document.createElement("div");

    progress.textContent =
        `Question ${
            dailyChallengeIndex + 1
        } of ${
            dailyChallengeQuestions.length
        }`;

    progress.style.display =
        "inline-block";

    progress.style.padding =
        "7px 14px";

    progress.style.borderRadius =
        "20px";

    progress.style.background =
        "#e8edff";

    progress.style.color =
        "#4056d6";

    progress.style.fontSize =
        "14px";

    progress.style.fontWeight =
        "700";

    progress.style.marginBottom =
        "18px";


    box.appendChild(
        progress
    );


    // ========================================
    // SUBJECT
    // ========================================

    const subject =
        document.createElement("div");

    subject.textContent =
        question.subject ||
        "General";


    subject.style.color =
        "#4056d6";

    subject.style.fontSize =
        "15px";

    subject.style.fontWeight =
        "800";

    subject.style.textTransform =
        "uppercase";

    subject.style.letterSpacing =
        "1px";

    subject.style.marginBottom =
        "8px";


    box.appendChild(
        subject
    );


    // ========================================
    // DIFFICULTY
    // ========================================

    const difficulty =
        document.createElement("span");

    difficulty.textContent =
        question.difficulty ||
        "Medium";


    difficulty.style.display =
        "inline-block";

    difficulty.style.padding =
        "5px 12px";

    difficulty.style.borderRadius =
        "15px";

    difficulty.style.background =
        "#fff1d6";

    difficulty.style.color =
        "#a65b00";

    difficulty.style.fontSize =
        "13px";

    difficulty.style.fontWeight =
        "700";

    difficulty.style.marginBottom =
        "20px";


    box.appendChild(
        difficulty
    );


    // ========================================
    // QUESTION
    // ========================================

    const questionText =
        document.createElement("h3");

    questionText.textContent =
        question.question;


    questionText.style.color =
        "#172033";

    questionText.style.fontSize =
        "22px";

    questionText.style.lineHeight =
        "1.5";

    questionText.style.fontWeight =
        "750";

    questionText.style.margin =
        "5px 0 25px 0";


    box.appendChild(
        questionText
    );


    // ========================================
    // OPTIONS
    // ========================================

    const options =
        document.createElement("div");

    options.style.display =
        "grid";

    options.style.gap =
        "12px";


    if (
        !Array.isArray(
            question.options
        )
    ) {

        question.options =
            [];

    }


    question.options.forEach(
        (option, index) => {

            const button =
                document.createElement(
                    "button"
                );


                    button.type = "button";

                    button.className = "daily-answer";

                    button.textContent =`${String.fromCharCode(65 + index)}. ${option}`;


            button.style.width =
                "100%";

            button.style.padding =
                "16px 18px";

            button.style.borderRadius =
                "14px";

            button.style.border =
                "2px solid #e1e5ef";

            button.style.background =
                "#ffffff";

            button.style.color =
                "#172033";

            button.style.cursor =
                "pointer";

            button.style.textAlign =
                "left";

            button.style.fontSize =
                "16px";

            button.style.fontWeight =
                "600";

            button.style.transition =
                "all 0.2s ease";


            button.addEventListener(
                "mouseenter",
                () => {

                    button.style.background =
                        "#eef1ff";

                    button.style.borderColor =
                        "#586bea";

                    button.style.transform =
                        "translateY(-2px)";

                    button.style.boxShadow =
                        "0 6px 18px rgba(64,86,214,0.15)";

                }
            );


            button.addEventListener(
                "mouseleave",
                () => {

                    button.style.background =
                        "#ffffff";

                    button.style.borderColor =
                        "#e1e5ef";

                    button.style.transform =
                        "translateY(0)";

                    button.style.boxShadow =
                        "none";

                }
            );


            button.addEventListener(
                "click",
                () => {

                    submitDailyAnswer(
                        question.id,
                        index
                    );

                }
            );


            options.appendChild(
                button
            );

        }
    );


    box.appendChild(
        options
    );


    // ========================================
    // FOOTER
    // ========================================

    const footer =
        document.createElement("p");

    footer.textContent =
        "💡 Choose the best answer to continue";


    footer.style.textAlign =
        "center";

    footer.style.color =
        "#687386";

    footer.style.fontSize =
        "14px";

    footer.style.marginTop =
        "24px";

    footer.style.marginBottom =
        "0";


    box.appendChild(
        footer
    );


    // ========================================
    // ADD TO PAGE
    // ========================================

    modal.appendChild(
        box
    );


    document.body.appendChild(
        modal
    );

}

// ========================================
// SUBMIT DAILY ANSWER
// ========================================

function submitDailyAnswer(
    questionId,
    answer
) {

    dailyChallengeAnswers.push({

        questionId:
            questionId,

        answer:
            answer

    });


    dailyChallengeIndex++;


    if (
        dailyChallengeIndex <
        dailyChallengeQuestions.length
    ) {

        showDailyChallengeQuestion();

    } else {

        completeDailyChallenge();

    }

}


// ========================================
// COMPLETE DAILY CHALLENGE
// ========================================

async function completeDailyChallenge() {

    const modal =
        document.getElementById(
            "dailyChallengeModal"
        );


    if (modal) {

        modal.innerHTML = `

            <div style="
                background:white;
                padding:30px;
                border-radius:18px;
                text-align:center;
            ">

                <h2>
                    ⏳ Calculating your score...
                </h2>

                <p>
                    Please wait.
                </p>

            </div>

        `;

    }


    try {

        const data =
            await api(
                "/api/daily-challenge/complete",
                {

                    method:
                        "POST",

                    body:
                        JSON.stringify({

                            answers:
                                dailyChallengeAnswers

                        })

                }
            );


        console.log(
            "Daily Challenge completed:",
            data
        );


        dailyChallengeScore =
            data.score;


        if (data.user) {

            currentUser =
                data.user;


            updateUI();

        }


        if (modal) {

            modal.innerHTML = `

                <div style="
                    background:white;
                    padding:35px;
                    border-radius:18px;
                    text-align:center;
                    max-width:500px;
                ">

                    <h2>
                        🎉 Challenge Complete!
                    </h2>

                    <h3>
                        Score:
                        ${data.score}/${data.total}
                    </h3>

                    <p>
                        ⭐ You earned
                        <strong>
                            +${data.xpEarned} XP
                        </strong>
                    </p>

                    <button
                        id="dailyChallengeClose"
                        style="
                            padding:12px 24px;
                            border:0;
                            border-radius:10px;
                            cursor:pointer;
                            font-weight:700;
                        "
                    >
                        Back to Lobby
                    </button>

                </div>

            `;


            const closeButton =
                document.getElementById(
                    "dailyChallengeClose"
                );


            if (closeButton) {

                closeButton.addEventListener(
                    "click",
                    () => {

                        modal.remove();

                    }
                );

            }

        }


        await loadUser();


        await loadLeaderboard();


    } catch (error) {

        console.error(
            "Daily Challenge completion error:",
            error
        );


        if (modal) {

            modal.innerHTML = `

                <div style="
                    background:white;
                    padding:30px;
                    border-radius:18px;
                    text-align:center;
                ">

                    <h2>
                        ❌ Challenge Error
                    </h2>

                    <p>
                        ${escapeHtml(
                            error.message
                        )}
                    </p>

                    <button
                        id="dailyChallengeErrorClose"
                        style="
                            padding:12px 24px;
                            border:0;
                            border-radius:10px;
                            cursor:pointer;
                            font-weight:700;
                        "
                    >
                        Close
                    </button>

                </div>

            `;


            const closeButton =
                document.getElementById(
                    "dailyChallengeErrorClose"
                );


            if (closeButton) {

                closeButton.addEventListener(
                    "click",
                    () => {

                        modal.remove();

                    }
                );

            }

        } else {

            alert(
                "Could not complete the challenge.\n\n" +
                error.message
            );

        }

    }

}


// ========================================
// INITIALIZE DAILY CHALLENGE BUTTON
// ========================================

function initializeDailyChallenge() {

    console.log(
        "Initializing Daily Challenge..."
    );


    createDailyChallengeUI();

}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDailyChallenge
    );

} else {

    initializeDailyChallenge();

}


// ========================================
// AUTO LOGIN
// ========================================

async function autoLogin() {

    if (!token) {

        return;

    }


    try {

        await openApp();

    } catch (error) {

        console.error(
            "Auto login error:",
            error
        );


        logout();

    }

}


autoLogin();