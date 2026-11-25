import os
import testmu
from testmu import expect, var, set_var
from playwright.async_api import Page

testmu.configure(
    build="aea7d4e3-bb18-4a7e-acd3-19c2f484c645",
    name="Verify Portfolio Display on CTA Click",
    tc_id="TC-72",
    network=os.getenv("NETWORK", "false").lower() == "true",
    variables={"portfolio_section_or_panel_visible": "true", "portfolio_section_company_name_present": "true", "page_visible_change_after_view_portfolio_click": "true"},
    auto_heal_version="AH2",
    default_action_timeout_ms=60000,
    default_navigation_timeout_ms=60000,
    kane_run_v4=True,
)

@testmu.test
async def test(page: Page):
    async with testmu.step('Navigate to http://localhost:3000/t/atlas', instruction_id='3bd2178f-2f2a-4b6f-8cf1-90a2dcf9ea63'):
        await page.goto("http://localhost:3000/t/atlas")
    
    async with testmu.step('Clicking View portfolio button', instruction_id='0c2700b1-30a4-4109-9aa8-247cb3c504e5'):
        _loc_1 = page.locator("internal:role=button[name=\"View portfolio\"i]")
        
        await _loc_1.click()
    
    async with testmu.step('Checking whether the portfolio panel is visible'):
        set_var('portfolio_section_or_panel_visible', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {4: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (!!(el(4).offsetWidth || el(4).offsetHeight || el(4).getClientRects().length) && /Portfolio Companies/i.test(el(4).innerText));\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="Active Investments Portfolio Companies Companies backed by Atlas Capital: Apex"i'], query='whether the Portfolio Companies panel is visible on the page', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='A portfolio section or panel is visible on the page.'))
    
    async with testmu.step('Checking for a company name in the portfolio panel'):
        set_var('portfolio_section_company_name_present', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {4: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (!!(el(4).offsetWidth || el(4).offsetHeight || el(4).getClientRects().length) && /Apex Robotics|FleetPulse|Ironclad Dynamics/.test(el(4).innerText));\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="Active Investments Portfolio Companies Companies backed by Atlas Capital: Apex"i'], query='whether at least one company name is present in the visible Portfolio Companies panel', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='The visible portfolio section contains at least one company name.'))
    
    async with testmu.step('Checking for the visible portfolio view change'):
        set_var('page_visible_change_after_view_portfolio_click', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {4: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (!!(el(4).offsetWidth || el(4).offsetHeight || el(4).getClientRects().length) && el(4).classList.contains('on') && /Portfolio Companies/i.test(el(4).innerText));\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="Active Investments Portfolio Companies Companies backed by Atlas Capital: Apex"i'], query='whether the Portfolio Companies panel is visibly displayed in its active state on the page', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='Clicking the button produced a visible change on the page.'))
    
    async with testmu.step('Assertion check', instruction_id='c3dae406-0b0d-43df-a117-61a1cba37b1a'):
        await testmu.verify_assertion(page, 'Assertion check', {'operator': ['equals'], 'assertion_operands': [], 'left_operand': None, 'right_operand': None, 'operands': [], 'sub_results': [{'description': 'A portfolio section or panel is visible on the page.', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{portfolio_section_or_panel_visible}}', 'store_key': 'portfolio_section_or_panel_visible', 'variable_refs': {'{{portfolio_section_or_panel_visible}}': 'true'}}, {'description': 'The visible portfolio section contains at least one company name.', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{portfolio_section_company_name_present}}', 'store_key': 'portfolio_section_company_name_present', 'variable_refs': {'{{portfolio_section_company_name_present}}': 'true'}}, {'description': 'Clicking the button produced a visible change on the page.', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{page_visible_change_after_view_portfolio_click}}', 'store_key': 'page_visible_change_after_view_portfolio_click', 'variable_refs': {'{{page_visible_change_after_view_portfolio_click}}': 'true'}}], 'sub_checks': [{'description': 'A portfolio section or panel is visible on the page.', 'store_key': 'portfolio_section_or_panel_visible', 'expected_value': 'true', 'extracted_value': '{{portfolio_section_or_panel_visible}}', 'operator': 'equals', 'transforms': []}, {'description': 'The visible portfolio section contains at least one company name.', 'store_key': 'portfolio_section_company_name_present', 'expected_value': 'true', 'extracted_value': '{{portfolio_section_company_name_present}}', 'operator': 'equals', 'transforms': []}, {'description': 'Clicking the button produced a visible change on the page.', 'store_key': 'page_visible_change_after_view_portfolio_click', 'expected_value': 'true', 'extracted_value': '{{page_visible_change_after_view_portfolio_click}}', 'operator': 'equals', 'transforms': []}], 'composite_operator': 'and', 'claim': 'After the click, a portfolio section or panel is visible on the page, the visible portfolio section contains at least one company name, and clicking the button produced a visible change on the page.'})


if __name__ == "__main__":
    testmu.run(test)