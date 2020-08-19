const puppeteer = require("puppeteer");
const applyEvasions = require("./apply-evasions");

(async () => {
    const browser = await puppeteer.launch({
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-web-security",
            "--disable-setuid-sandbox",
            "--disable-infobars",
            "--window-position=0,0",
            "--lang=en-US,en;q=0.9", // send accept-language header
            "--proxy-server=154.13.49.12:22222", // hola us cogent server
        ],
        // headless: false,
        headless: true,
        ignoreHTTPSErrors: true,
        dumpio: true, // log console events
    });

    const page = await browser.newPage();

    // proxy credentials
    await page.authenticate({
        username: "user-uuid-63add07fed46a05cdefc96332437cbbf",
        password: "8c212c805e06",
    });

    await applyEvasions(page);

    /* PERIMETERX SITES */
    // await page.goto("https://www.usa-people-search.com/names/a_400_599_1", {
    //     waitUntil: "networkidle0",
    // });

    /* DISTIL SITES (PASSED) */
    await page.goto("https://lufthansa.com", {
        waitUntil: "networkidle0",
    });
    // await page.goto("https://streeteasy.com", {
    //     waitUntil: "networkidle0",
    // });

    /* RECAPTCHA SCORE PAGE */
    // await page.goto(
    // "https://recaptcha-demo.appspot.com/recaptcha-v3-request-scores.php",
    // );

    /*
    LOCAL TESTING SITES (see tests folder)
    To test these, I ran these on a real browser and the headless browser.  I made fixes in the headless browser until the outputs matched.
    */
    // await page.goto("http://localhost:8000/distil.html");
    // await page.goto("http://localhost:8000/adscore.html");

    /* OTHER TESTING SITES (PASSED) */
    // await page.goto("https://antoinevastel.com/bots");
    // await page.goto("https://infosimples.github.io/detect-headless/");
    // await page.goto("https://arh.antoinevastel.com/bots/areyouheadless");

    // if true we passed distil check
    console.log(
        (await page.title()) ===
            "Book a flight now and discover the world | Lufthansa",
    );

    await browser.close();
})();
