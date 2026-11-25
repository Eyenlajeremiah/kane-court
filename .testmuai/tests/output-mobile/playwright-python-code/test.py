import os
import testmu
from testmu import expect, var, set_var
from playwright.async_api import Page

testmu.configure(
    build="46acd8ec-e9bb-414c-b631-ff7ef0401d77",
    name="Verify Responsive Layout at 800px Width",
    tc_id="TC-74",
    network=os.getenv("NETWORK", "false").lower() == "true",
    variables={"page_horizontal_scrolling": "false", "headline_fully_visible": "true", "primary_call_to_action_button_fully_visible": "true", "headline_primary_cta_overlap": "false"},
    auto_heal_version="AH2",
    default_action_timeout_ms=60000,
    default_navigation_timeout_ms=60000,
    kane_run_v4=True,
)

@testmu.test
async def test(page: Page):
    async with testmu.step('Navigate to http://localhost:3000/t/atlas', instruction_id='480e9ddd-9ff1-40e5-955f-690ee64a04e3'):
        await page.goto("http://localhost:3000/t/atlas")
    
    async with testmu.step('Waiting for the page to load at a narrow 800px viewport', instruction_id='94619072-13b9-42f5-86cd-def1ddf15ff0'):
        await page.wait_for_timeout(1000)
    
    async with testmu.step('Checking whether page horizontal scrolling is present'):
        set_var('page_horizontal_scrolling', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {1: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (el(1).ownerDocument.documentElement.scrollWidth > el(1).ownerDocument.documentElement.clientWidth);\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:role=heading[name="Back the founders who build"i]'], query='whether horizontal scrolling is present on the page', expected_value='false', needs_unit_conversion=False, operator='equals', transforms=[], condition='the page does not scroll sideways'))
    
    async with testmu.step('Checking whether the headline is fully visible'):
        set_var('headline_fully_visible', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {1: 0};\n  const el = (i) => els[__m[i]];\n  const __v = ((()=>{const r=el(1).getBoundingClientRect(),s=getComputedStyle(el(1));return r.width>0&&r.height>0&&r.top>=0&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&s.display!=='none'&&s.visibility!=='hidden'&&parseFloat(s.opacity)>0})());\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:role=heading[name="Back the founders who build"i]'], query='whether the headline at the top of the page is fully visible', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='the headline is fully visible'))
    
    async with testmu.step('Checking whether the primary call-to-action button is fully visible'):
        set_var('primary_call_to_action_button_fully_visible', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {3: 0};\n  const el = (i) => els[__m[i]];\n  const __v = ((()=>{const r=el(3).getBoundingClientRect(),s=getComputedStyle(el(3));return r.width>0&&r.height>0&&r.top>=0&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&s.display!=='none'&&s.visibility!=='hidden'&&parseFloat(s.opacity)>0})());\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:role=button[name="View portfolio"i]'], query='whether the View portfolio primary call-to-action button in the hero area is fully visible', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='the primary call-to-action button is fully visible'))
    
    async with testmu.step('Checking whether the headline and primary call-to-action button overlap'):
        set_var('headline_primary_cta_overlap', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {1: 0, 3: 1};\n  const el = (i) => els[__m[i]];\n  const __v = ((()=>{const a=el(1).getBoundingClientRect(),b=el(3).getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top})());\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:role=heading[name="Back the founders who build"i]', 'internal:role=button[name="View portfolio"i]'], query='whether the headline and the View portfolio primary call-to-action button in the hero area overlap', expected_value='false', needs_unit_conversion=False, operator='equals', transforms=[], condition='the headline and the primary call-to-action button are not overlapping'))
    
    async with testmu.step('Assertion check', instruction_id='d15b2630-b43c-439c-b336-ec915dbcd8fa'):
        await testmu.verify_assertion(page, 'Assertion check', {'operator': ['equals'], 'assertion_operands': [], 'left_operand': None, 'right_operand': None, 'operands': [], 'sub_results': [{'description': 'the page does not scroll sideways', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'false', 'extracted_value': '{{page_horizontal_scrolling}}', 'store_key': 'page_horizontal_scrolling', 'variable_refs': {'{{page_horizontal_scrolling}}': 'false'}}, {'description': 'the headline is fully visible', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{headline_fully_visible}}', 'store_key': 'headline_fully_visible', 'variable_refs': {'{{headline_fully_visible}}': 'true'}}, {'description': 'the primary call-to-action button is fully visible', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{primary_call_to_action_button_fully_visible}}', 'store_key': 'primary_call_to_action_button_fully_visible', 'variable_refs': {'{{primary_call_to_action_button_fully_visible}}': 'true'}}, {'description': 'the headline and the primary call-to-action button are not overlapping', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'false', 'extracted_value': '{{headline_primary_cta_overlap}}', 'store_key': 'headline_primary_cta_overlap', 'variable_refs': {'{{headline_primary_cta_overlap}}': 'false'}}], 'sub_checks': [{'description': 'the page does not scroll sideways', 'store_key': 'page_horizontal_scrolling', 'expected_value': 'false', 'extracted_value': '{{page_horizontal_scrolling}}', 'operator': 'equals', 'transforms': []}, {'description': 'the headline is fully visible', 'store_key': 'headline_fully_visible', 'expected_value': 'true', 'extracted_value': '{{headline_fully_visible}}', 'operator': 'equals', 'transforms': []}, {'description': 'the primary call-to-action button is fully visible', 'store_key': 'primary_call_to_action_button_fully_visible', 'expected_value': 'true', 'extracted_value': '{{primary_call_to_action_button_fully_visible}}', 'operator': 'equals', 'transforms': []}, {'description': 'the headline and the primary call-to-action button are not overlapping', 'store_key': 'headline_primary_cta_overlap', 'expected_value': 'false', 'extracted_value': '{{headline_primary_cta_overlap}}', 'operator': 'equals', 'transforms': []}], 'composite_operator': 'and', 'claim': 'the page does not scroll sideways, and the headline and the primary call-to-action button are fully visible and not overlapping'})


if __name__ == "__main__":
    testmu.run(test)