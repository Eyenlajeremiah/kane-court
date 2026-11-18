import os
import testmu
from testmu import expect, var, set_var
from playwright.async_api import Page

testmu.configure(
    build="3db9c8cc-dd4a-497a-8bfa-5af3167d546c",
    name="Verify Portfolio Display on CTA Click",
    tc_id="TC-21",
    network=os.getenv("NETWORK", "false").lower() == "true",
    variables={"portfolio_section_or_panel_visible": "true", "portfolio_section_company_name_present": "true", "post_click_visible_change": "true"},
    auto_heal_version="AH2",
    default_action_timeout_ms=60000,
    default_navigation_timeout_ms=60000,
    kane_run_v4=True,
)

@testmu.test
async def test(page: Page):
    async with testmu.step('Navigate to http://localhost:3000/t/atlas', instruction_id='6d77f911-77e4-4fbe-b246-90a9d3a6c498'):
        await page.goto("http://localhost:3000/t/atlas")
    
    async with testmu.step('Clicking View portfolio button', instruction_id='1705feb5-58ce-4d69-a10b-5429573919e6'):
        _loc_1 = page.locator("internal:role=button[name=\"View portfolio\"i]")
        
        await _loc_1.click()
    
    async with testmu.step('Checking whether the portfolio section is visible'):
        set_var('portfolio_section_or_panel_visible', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {4: 0};\n  const el = (i) => els[__m[i]];\n  const __v = ((() => { const s=getComputedStyle(el(4)), r=el(4).getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 && /Portfolio Companies/.test(el(4).innerText); })());\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="Active Investments Portfolio Companies Companies backed by Atlas Capital: Apex"i'], query='whether the Portfolio Companies section in the main page content is visible', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='A portfolio section or panel is visible on the page.'))
    
    async with testmu.step('Checking for a company name in the portfolio section'):
        set_var('portfolio_section_company_name_present', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {4: 0};\n  const el = (i) => els[__m[i]];\n  const __v = ((() => { const s=getComputedStyle(el(4)), r=el(4).getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 && /Apex Robotics|FleetPulse/.test(el(4).innerText); })());\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="Active Investments Portfolio Companies Companies backed by Atlas Capital: Apex"i'], query='whether at least one company name is present in the visible Portfolio Companies section', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='The visible portfolio section contains at least one company name.'))
    
    async with testmu.step('Checking for visible portfolio content after the button click'):
        set_var('post_click_visible_change', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {4: 0};\n  const el = (i) => els[__m[i]];\n  const __v = ((() => { const s=getComputedStyle(el(4)), r=el(4).getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 && /ACTIVE INVESTMENTS/.test(el(4).innerText); })());\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="Active Investments Portfolio Companies Companies backed by Atlas Capital: Apex"i'], query='whether the Active Investments portfolio content is visibly displayed in the main page after the View portfolio button', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='Clicking the button produced a visible change on the page.'))
    
    async with testmu.step('Assertion check', instruction_id='abb80326-6366-48b9-af2f-aa7b9faee635'):
        await testmu.verify_assertion(page, 'Assertion check', {'operator': ['equals'], 'assertion_operands': [], 'left_operand': None, 'right_operand': None, 'operands': [], 'sub_results': [{'description': 'A portfolio section or panel is visible on the page.', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{portfolio_section_or_panel_visible}}', 'store_key': 'portfolio_section_or_panel_visible', 'variable_refs': {'{{portfolio_section_or_panel_visible}}': 'true'}}, {'description': 'The visible portfolio section contains at least one company name.', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{portfolio_section_company_name_present}}', 'store_key': 'portfolio_section_company_name_present', 'variable_refs': {'{{portfolio_section_company_name_present}}': 'true'}}, {'description': 'Clicking the button produced a visible change on the page.', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{post_click_visible_change}}', 'store_key': 'post_click_visible_change', 'variable_refs': {'{{post_click_visible_change}}': 'true'}}], 'sub_checks': [{'description': 'A portfolio section or panel is visible on the page.', 'store_key': 'portfolio_section_or_panel_visible', 'expected_value': 'true', 'extracted_value': '{{portfolio_section_or_panel_visible}}', 'operator': 'equals', 'transforms': []}, {'description': 'The visible portfolio section contains at least one company name.', 'store_key': 'portfolio_section_company_name_present', 'expected_value': 'true', 'extracted_value': '{{portfolio_section_company_name_present}}', 'operator': 'equals', 'transforms': []}, {'description': 'Clicking the button produced a visible change on the page.', 'store_key': 'post_click_visible_change', 'expected_value': 'true', 'extracted_value': '{{post_click_visible_change}}', 'operator': 'equals', 'transforms': []}], 'composite_operator': 'and', 'claim': 'a portfolio section or panel is visible on the page; the visible portfolio section contains at least one company name; clicking the button produced a visible change on the page. The test PASSES when all three are true, and FAILS if any one of them is false.'})


if __name__ == "__main__":
    testmu.run(test)