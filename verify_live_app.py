import time
from playwright.sync_api import sync_playwright

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
file_url = "file:///d:/Hala/Random/Play/Android/index.html#exercise"

print("Running Playwright verification for Single Click Mode & Pill Hiding...")

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=edge_path, headless=True)
    context = browser.new_context(
        viewport={'width': 412, 'height': 915},
        user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36",
        color_scheme='dark'
    )
    page = context.new_page()

    # 1. Open Exercise Tab
    page.goto(file_url, wait_until="domcontentloaded")
    time.sleep(1)
    page.evaluate("""() => {
        const el = document.querySelector('a[href="#exercise"]') || document.querySelector('[data-tab="exercise"]');
        if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

        // Mark first workout as TODAY
        if (exerciseData.workouts && exerciseData.workouts.length > 0) {
            exerciseData.workouts[0].date = getTodayDateString();
            saveExerciseDataToStorage();
            renderExercisePage();
        }
    }""")
    time.sleep(1.5)

    # 2. Scroll down 1200px past active card
    print("Scrolling down 1200px past active workout card...")
    page.evaluate("window.scrollTo(0, 1200)")
    time.sleep(1)
    page.evaluate("updateFloatingSummaryButtonState()")
    time.sleep(0.5)

    pill_mode_mid = page.evaluate("document.getElementById('exercise-floating-settings-btn').dataset.mode")
    print(f" -> When scrolled mid-page: Pill mode = '{pill_mode_mid}'")
    page.screenshot(path="scratch_mid_scroll_active_button_only.png")

    # 3. Click Active Workout pill (verify modal does NOT open)
    print("Clicking Active Workout pill...")
    page.click("#exercise-floating-settings-btn")
    time.sleep(1.5)
    page.evaluate("updateFloatingSummaryButtonState()")
    time.sleep(0.5)

    is_modal_visible = page.evaluate("""() => {
        const modal = document.getElementById('exercise-settings-modal');
        return modal && !modal.classList.contains('hidden');
    }""")
    is_pill_hidden = page.evaluate("""() => {
        const pill = document.getElementById('exercise-floating-settings-btn');
        return pill && pill.classList.contains('hidden-float');
    }""")
    is_sticky_hidden = page.evaluate("""() => {
        const hero = document.getElementById('today-workout-hero');
        return hero && hero.classList.contains('hidden-sticky');
    }""")

    print(f" -> Did Exercise Settings modal open? {is_modal_visible} (Should be False!)")
    print(f" -> Upon arriving at active card: Is floating pill hidden? {is_pill_hidden} (Should be True!)")
    print(f" -> Upon arriving at active card: Is sticky top banner hidden? {is_sticky_hidden} (Should be True!)")

    page.screenshot(path="scratch_active_card_arrival_clean_screen.png")

    browser.close()
    print("Verification completed successfully!")
