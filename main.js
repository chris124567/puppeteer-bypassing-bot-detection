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
            "--proxy-server=170.78.75.55:22222", // hola argentina proxy (tried to pick sketchy region to raise "suspiciousness" score)
        ],
        headless: false,
        ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // proxy credentials
    await page.authenticate({
        username: "user-uuid-63add07fed46a05cdefc96332437cbbf",
        password: "8c212c805e06",
    });

    await applyEvasions(page);

    /* PERIMETERX SITES (Was able to navigate sites, I don't have an account on any of them so I couldn't test purchasing things) */
    // await page.goto("https://www.footlocker.com/");
    // await page.goto("https://www.kiva.org/");
    // await page.goto("https://stockx.com/sneakers");

    /* DISTIL SITES (PASSED) */
    // await page.goto("https://www.lufthansa.com");
    await page.goto("https://streeteasy.com");

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

    // await browser.close();
})();
