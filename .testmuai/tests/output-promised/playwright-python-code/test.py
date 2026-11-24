import os
import testmu
from testmu import expect, var, set_var
from playwright.async_api import Page

testmu.configure(
    build="86bb9b74-621e-4a1f-a5ac-e8647fa3caf4",
    name="Verify Call-to-Action Button Functionality and Content Accuracy",
    tc_id="TC-51",
    network=os.getenv("NETWORK", "false").lower() == "true",
    variables={"headline_text": "Back the founders who build for decades.", "button_label": "View portfolio", "revealed_panel_text": "ACTIVE INVESTMENTS\nPortfolio Companies\n\nCompanies backed by Atlas Capital:\n\nApex Robotics\n\nAutonomous warehouse robotics and automated fulfillment systems.\n\nFleetPulse\n\nFreight telematics and supply chain intelligence platform.\n\nIronclad Dynamics\n\nHeavy machinery automation and predictive maintenance software."},
    auto_heal_version="AH2",
    default_action_timeout_ms=60000,
    default_navigation_timeout_ms=60000,
    kane_run_v4=True,
)

@testmu.test
async def test(page: Page):
    async with testmu.step('Navigate to http://localhost:3000/t/atlas', instruction_id='6bdfa57d-024d-4004-88eb-238585985772'):
        await page.goto("http://localhost:3000/t/atlas")
    
    async with testmu.step('Extracting the page headline text'):
        set_var('headline_text', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {1: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (el(1).innerText.trim());\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:role=heading[name="Back the founders who build"i]'], query='the headline text in the top-level page heading', expected_value='', needs_unit_conversion=False, operator='equals', transforms=['strip'], condition='the headline at the top of the page is saved as {{headline_text}}'))
    
    async with testmu.step('Extracting the primary call-to-action button text'):
        set_var('button_label', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {3: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (el(3).innerText.trim());\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:role=button[name="View portfolio"i]'], query='the text on the primary call-to-action button below the introductory paragraph', expected_value='', needs_unit_conversion=False, operator='equals', transforms=['strip'], condition='the text on the primary call-to-action button is saved as {{button_label}}'))
    
    async with testmu.step('Clicking the View portfolio button', instruction_id='522d97f8-bbfd-419a-b3d3-2e16b5af2a31'):
        _loc_1 = page.locator("internal:role=button[name=\"View portfolio\"i]")
        
        await _loc_1.click()
    
    async with testmu.step('Reading the revealed panel text'):
        set_var('revealed_panel_text', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {4: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (el(4).innerText.trim());\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="Active Investments Portfolio Companies Companies backed by Atlas Capital: Apex"i'], query='the complete text shown in the revealed portfolio panel', expected_value='', needs_unit_conversion=False, operator='equals', transforms=['strip'], condition='exactly what the revealed panel said is saved as {{revealed_panel_text}}'))


if __name__ == "__main__":
    testmu.run(test)