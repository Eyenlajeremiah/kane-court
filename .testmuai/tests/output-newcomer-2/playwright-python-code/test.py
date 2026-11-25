import os
import testmu
from testmu import expect, var, set_var
from playwright.async_api import Page

testmu.configure(
    build="7f8e124c-ec38-4256-b4f7-7c3982952208",
    name="Verify Portfolio Display Functionality",
    tc_id="TC-96",
    network=os.getenv("NETWORK", "false").lower() == "true",
    variables={"portfolio_section_or_panel_visible": "true", "portfolio_company_name_present": "true", "visible_page_change": "true"},
    auto_heal_version="AH2",
    default_action_timeout_ms=60000,
    default_navigation_timeout_ms=60000,
    kane_run_v4=True,
)

@testmu.test
async def test(page: Page):
    async with testmu.step('Navigate to http://localhost:3000/t/atlas', instruction_id='949dba7f-352f-46c4-a65c-a5d91feb2c2b'):
        await page.goto("http://localhost:3000/t/atlas")
    
    async with testmu.step('Clicking View portfolio button', instruction_id='8a6a8afc-14fa-47c0-9fed-25a25d25d73a'):
        _loc_1 = page.locator("internal:role=button[name=\"View portfolio\"i]")
        
        await _loc_1.click()
    
    async with testmu.step('Checking whether the portfolio section is visible'):
        set_var('portfolio_section_or_panel_visible', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {5: 0};\n  const el = (i) => els[__m[i]];\n  const __v = ((() => { const s=getComputedStyle(el(5)); const r=el(5).getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; })());\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:role=heading[name="Portfolio Companies"i]'], query='whether the Portfolio Companies section heading is visible on the page', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='A portfolio section or panel is visible on the page.'))
    
    async with testmu.step('Checking for a company name in the visible portfolio section'):
        set_var('portfolio_company_name_present', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {4: 0};\n  const el = (i) => els[__m[i]];\n  const __v = ((() => { const s=getComputedStyle(el(4)); const r=el(4).getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 && /\\b(Apex Robotics|FleetPulse|Ironclad Dynamics)\\b/.test(el(4).innerText); })());\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="Active Investments Portfolio Companies Companies backed by Atlas Capital: Apex"i'], query='whether at least one company name is visible in the portfolio companies section', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='The visible portfolio section contains at least one company name.'))
    
    async with testmu.step('Checking whether the page shows the portfolio content'):
        set_var('visible_page_change', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {5: 0};\n  const el = (i) => els[__m[i]];\n  const __v = ((() => { const s=getComputedStyle(el(5)); const r=el(5).getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; })());\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:role=heading[name="Portfolio Companies"i]'], query='whether the Portfolio Companies section is visible on the page', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='Clicking the button produced a visible change on the page.'))
    
    async with testmu.step('Assertion check', instruction_id='d28732ba-f9ad-4dc5-8583-eb1551508e26'):
        await testmu.verify_assertion(page, 'Assertion check', {'operator': ['equals'], 'assertion_operands': [], 'left_operand': None, 'right_operand': None, 'operands': [], 'sub_results': [{'description': 'A portfolio section or panel is visible on the page.', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{portfolio_section_or_panel_visible}}', 'store_key': 'portfolio_section_or_panel_visible', 'variable_refs': {'{{portfolio_section_or_panel_visible}}': 'true'}}, {'description': 'The visible portfolio section contains at least one company name.', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{portfolio_company_name_present}}', 'store_key': 'portfolio_company_name_present', 'variable_refs': {'{{portfolio_company_name_present}}': 'true'}}, {'description': 'Clicking the button produced a visible change on the page.', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{visible_page_change}}', 'store_key': 'visible_page_change', 'variable_refs': {'{{visible_page_change}}': 'true'}}], 'sub_checks': [{'description': 'A portfolio section or panel is visible on the page.', 'store_key': 'portfolio_section_or_panel_visible', 'expected_value': 'true', 'extracted_value': '{{portfolio_section_or_panel_visible}}', 'operator': 'equals', 'transforms': []}, {'description': 'The visible portfolio section contains at least one company name.', 'store_key': 'portfolio_company_name_present', 'expected_value': 'true', 'extracted_value': '{{portfolio_company_name_present}}', 'operator': 'equals', 'transforms': []}, {'description': 'Clicking the button produced a visible change on the page.', 'store_key': 'visible_page_change', 'expected_value': 'true', 'extracted_value': '{{visible_page_change}}', 'operator': 'equals', 'transforms': []}], 'composite_operator': 'and', 'claim': 'a portfolio section or panel is visible on the page; the visible portfolio section contains at least one company name; and clicking the button produced a visible change on the page'})


if __name__ == "__main__":
    testmu.run(test)