import os
import testmu
from testmu import expect, var, set_var
from playwright.async_api import Page

testmu.configure(
    build="d9396d04-389a-428d-accc-c969a1ea0e88",
    name="Verify Responsive Layout at 800px Width",
    tc_id="TC-98",
    network=os.getenv("NETWORK", "false").lower() == "true",
    variables={"horizontal_overflow_absent": "false", "headline_fully_visible": "true", "primary_call_to_action_button_fully_visible": "true", "headline_and_primary_call_to_action_button_overlap": "false"},
    auto_heal_version="AH2",
    default_action_timeout_ms=60000,
    default_navigation_timeout_ms=60000,
    kane_run_v4=True,
)

@testmu.test
async def test(page: Page):
    async with testmu.step('Navigate to http://localhost:3000/t/atlas', instruction_id='6eeb1f57-29bf-42f6-8d87-da6a40317392'):
        await page.goto("http://localhost:3000/t/atlas")
    
    async with testmu.step('Waiting for the narrow viewport page to load at 800px', instruction_id='954ab747-8d4c-4bd7-938e-3cece8ac0178'):
        await page.wait_for_timeout(1000)
    
    async with testmu.step('Checking whether horizontal overflow is present'):
        set_var('horizontal_overflow_absent', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {1: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (el(1).ownerDocument.documentElement.scrollWidth > el(1).ownerDocument.documentElement.clientWidth);\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:role=heading[name="Back the founders who build"i]'], query='whether horizontal overflow is present in the page document', expected_value='false', needs_unit_conversion=False, operator='equals', transforms=[], condition='the page does not scroll sideways'))
    
    async with testmu.step('Checking whether the hero headline is fully visible'):
        set_var('headline_fully_visible', await testmu.textual_analyzer(page, wrapped_js='(els) => {\n  const __m = {1: 0};\n  const el = (i) => els[__m[i]];\n  const __v = ((()=>{const r=el(1).getBoundingClientRect(), d=el(1).ownerDocument.documentElement; return r.width>0 && r.height>0 && r.left>=0 && r.top>=0 && r.right<=d.clientWidth && r.bottom<=d.clientHeight && getComputedStyle(el(1)).visibility!=="hidden" && getComputedStyle(el(1)).display!=="none"})());\n  return (typeof __v === \'boolean\' ? String(__v) : __v);\n}', locators=['internal:role=heading[name="Back the founders who build"i]'], query='whether the headline "Back the founders who build for decades." in the hero section is fully visible', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='the headline is fully visible'))
    
    async with testmu.step('Checking whether the primary call-to-action button is fully visible'):
        set_var('primary_call_to_action_button_fully_visible', await testmu.textual_analyzer(page, wrapped_js='(els) => {\n  const __m = {3: 0};\n  const el = (i) => els[__m[i]];\n  const __v = ((()=>{const r=el(3).getBoundingClientRect(), d=el(3).ownerDocument.documentElement; return r.width>0 && r.height>0 && r.left>=0 && r.top>=0 && r.right<=d.clientWidth && r.bottom<=d.clientHeight && getComputedStyle(el(3)).visibility!=="hidden" && getComputedStyle(el(3)).display!=="none"})());\n  return (typeof __v === \'boolean\' ? String(__v) : __v);\n}', locators=['internal:role=button[name="View portfolio"i]'], query='whether the "View portfolio" primary call-to-action button in the hero section is fully visible', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='the primary call-to-action button is fully visible'))
    
    async with testmu.step('Checking whether the hero headline and primary call-to-action button overlap'):
        set_var('headline_and_primary_call_to_action_button_overlap', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {1: 0, 3: 1};\n  const el = (i) => els[__m[i]];\n  const __v = ((()=>{const a=el(1).getBoundingClientRect(),b=el(3).getBoundingClientRect();return a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top})());\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:role=heading[name="Back the founders who build"i]', 'internal:role=button[name="View portfolio"i]'], query='whether overlap between the hero headline and the "View portfolio" primary call-to-action button is present', expected_value='false', needs_unit_conversion=False, operator='equals', transforms=[], condition='the headline and the primary call-to-action button are not overlapping'))
    
    async with testmu.step('Assertion check', instruction_id='daab5f9f-ad5f-49a8-a88b-826b96f20feb'):
        await testmu.verify_assertion(page, 'Assertion check', {'operator': ['equals'], 'assertion_operands': [], 'left_operand': None, 'right_operand': None, 'operands': [], 'sub_results': [{'description': 'the page does not scroll sideways', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'false', 'extracted_value': '{{horizontal_overflow_absent}}', 'store_key': 'horizontal_overflow_absent', 'variable_refs': {'{{horizontal_overflow_absent}}': 'false'}}, {'description': 'the headline is fully visible', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{headline_fully_visible}}', 'store_key': 'headline_fully_visible', 'variable_refs': {'{{headline_fully_visible}}': 'true'}}, {'description': 'the primary call-to-action button is fully visible', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{primary_call_to_action_button_fully_visible}}', 'store_key': 'primary_call_to_action_button_fully_visible', 'variable_refs': {'{{primary_call_to_action_button_fully_visible}}': 'true'}}, {'description': 'the headline and the primary call-to-action button are not overlapping', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'false', 'extracted_value': '{{headline_and_primary_call_to_action_button_overlap}}', 'store_key': 'headline_and_primary_call_to_action_button_overlap', 'variable_refs': {'{{headline_and_primary_call_to_action_button_overlap}}': 'false'}}], 'sub_checks': [{'description': 'the page does not scroll sideways', 'store_key': 'horizontal_overflow_absent', 'expected_value': 'false', 'extracted_value': '{{horizontal_overflow_absent}}', 'operator': 'equals', 'transforms': []}, {'description': 'the headline is fully visible', 'store_key': 'headline_fully_visible', 'expected_value': 'true', 'extracted_value': '{{headline_fully_visible}}', 'operator': 'equals', 'transforms': []}, {'description': 'the primary call-to-action button is fully visible', 'store_key': 'primary_call_to_action_button_fully_visible', 'expected_value': 'true', 'extracted_value': '{{primary_call_to_action_button_fully_visible}}', 'operator': 'equals', 'transforms': []}, {'description': 'the headline and the primary call-to-action button are not overlapping', 'store_key': 'headline_and_primary_call_to_action_button_overlap', 'expected_value': 'false', 'extracted_value': '{{headline_and_primary_call_to_action_button_overlap}}', 'operator': 'equals', 'transforms': []}], 'composite_operator': 'and', 'claim': 'the page does not scroll sideways, and the headline and the primary call-to-action button are fully visible and not overlapping'})


if __name__ == "__main__":
    testmu.run(test)