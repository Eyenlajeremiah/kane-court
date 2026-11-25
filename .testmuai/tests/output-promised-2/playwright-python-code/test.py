import os
import testmu
from testmu import expect, var, set_var
from playwright.async_api import Page

testmu.configure(
    build="d637d0d9-9ca6-4ef2-8dea-fa375b4e9ad0",
    name="Verify Call-to-Action Content Accuracy",
    tc_id="TC-100",
    network=os.getenv("NETWORK", "false").lower() == "true",
    variables={"headline_text": "Back the founders who build for decades.", "button_label": "View portfolio", "revealed_panel_text": "ACTIVE INVESTMENTS\nPortfolio Companies\n\nCompanies backed by Atlas Capital:\n\nApex Robotics\n\nAutonomous warehouse robotics and automated fulfillment systems.\n\nFleetPulse\n\nFreight telematics and supply chain intelligence platform.\n\nIronclad Dynamics\n\nHeavy machinery automation and predictive maintenance software."},
    auto_heal_version="AH2",
    default_action_timeout_ms=60000,
    default_navigation_timeout_ms=60000,
    kane_run_v4=True,
)

@testmu.test
async def test(page: Page):
    async with testmu.step('Navigate to http://localhost:3000/t/atlas', instruction_id='ed1343d1-c313-4632-9dbf-04eb9e51c1cf'):
        await page.goto("http://localhost:3000/t/atlas")
    
    async with testmu.step('Extracting the top page headline'):
        set_var('headline_text', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {1: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (el(1).innerText.trim());\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:role=heading[name="Back the founders who build"i]'], query='the top-level headline text at the top of the page', expected_value='', needs_unit_conversion=False, operator='equals', transforms=['strip'], condition='the headline at the top of the page is saved as {{headline_text}}'))
    
    async with testmu.step('Extracting the primary call-to-action button label'):
        set_var('button_label', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {3: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (el(3).innerText.trim());\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:role=button[name="View portfolio"i]'], query='the text on the primary call-to-action button near the page headline', expected_value='', needs_unit_conversion=False, operator='equals', transforms=['strip'], condition='the text on the primary call-to-action button is saved as {{button_label}}'))
    
    async with testmu.step('Clicking the View portfolio button', instruction_id='ced709cd-fb17-46d4-b21e-807c15a850a5'):
        _loc_1 = page.locator("internal:role=button[name=\"View portfolio\"i]")
        
        await _loc_1.click()
    
    async with testmu.step('Reading the text from the revealed portfolio panel'):
        set_var('revealed_panel_text', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {4: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (el(4).innerText.trim());\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="Active Investments Portfolio Companies Companies backed by Atlas Capital: Apex"i'], query='the complete text displayed in the revealed portfolio panel', expected_value='', needs_unit_conversion=False, operator='equals', transforms=['strip'], condition='exactly what the revealed panel said is saved as {{revealed_panel_text}}'))


if __name__ == "__main__":
    testmu.run(test)