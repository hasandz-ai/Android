import time
from playwright.sync_api import sync_playwright

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
file_url = "file:///d:/Hala/Random/Play/Android/index.html"

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=edge_path, headless=True)
    page = browser.new_page()
    page.goto(file_url, wait_until="domcontentloaded")
    time.sleep(1)

    result = page.evaluate("""() => {
        const testMatch = verifyCodePin('191919');
        const num = parseInt('191919', 10);
        const calc = (num ^ MASTER_PIN_MASK) * 17 + 109;
        return { testMatch, num, calc, signature: MASTER_PIN_SIGNATURE, mask: MASTER_PIN_MASK };
    }""")
    print("JS Test Result:", result)
    browser.close()
