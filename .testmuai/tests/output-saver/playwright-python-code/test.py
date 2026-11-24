import os
import testmu
from testmu import expect, var, set_var
from playwright.async_api import Page

testmu.configure(
    build="db8543f4-effd-43cd-a416-6539bc9f23cf",
    name="Newsletter Subscription Confirmation",
    tc_id="TC-50",
    network=os.getenv("NETWORK", "false").lower() == "true",
    variables={"confirmation_message_visible": "true", "email_field_submitted_value": "founder@example.com", "confirmation_message": "Thank you for subscribing! Your request has been received."},
    auto_heal_version="AH2",
    default_action_timeout_ms=60000,
    default_navigation_timeout_ms=60000,
    kane_run_v4=True,
)

@testmu.test
async def test(page: Page):
    async with testmu.step('Navigate to http://localhost:3000/t/atlas', instruction_id='7937d754-332f-488d-b4b0-9458c100f3a1'):
        await page.goto("http://localhost:3000/t/atlas")
    
    async with testmu.step('Waiting for the plan to queue steps', instruction_id='9423ff5d-0ec5-4053-8066-95d2f643c32e'):
        await page.wait_for_timeout(1000)
    
    async with testmu.step('Type "founder@example.com" into "Founder Newsletter"', instruction_id='0351ea8a-90e5-4ec2-a8b9-fee333a88495'):
        element_0 = page.locator("internal:role=textbox[name=\"Founder Newsletter\"i]")
        
        await testmu.fill(element_0, "founder@example.com")
    
    async with testmu.step('Clicking the Subscribe button to submit the newsletter form', instruction_id='adc4c95a-5559-401a-96fa-8cf29615269d'):
        _loc_1 = page.locator("internal:role=button[name=\"Subscribe\"i]")
        
        await _loc_1.click()
    
    async with testmu.step('Checking whether the confirmation message is present'):
        set_var('confirmation_message_visible', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {23: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (Array.from(el(23).querySelectorAll('*')).some(node => node.innerText.trim() === 'Thank you for subscribing! Your request has been received.' && !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length)));\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="Founder Newsletter Subscribe"i'], query='whether the confirmation message in the Founder Newsletter form is visible', expected_value='true', needs_unit_conversion=False, operator='equals', transforms=[], condition='A visible confirmation message appears after submitting.'))
    
    async with testmu.step('Reading the submitted email field value'):
        set_var('email_field_submitted_value', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {25: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (el(25).value);\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:role=textbox[name="Founder Newsletter"i]'], query='the submitted value in the Founder Newsletter email field', expected_value='founder@example.com', needs_unit_conversion=False, operator='equals', transforms=['strip'], condition='The email field still holds the submitted value.'))
    
    async with testmu.step('Extracting the confirmation message after submission'):
        set_var('confirmation_message', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {23: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (Array.from(el(23).querySelectorAll('*')).find(node => node.innerText.trim() === 'Thank you for subscribing! Your request has been received.')?.innerText.trim() ?? null);\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:text="Founder Newsletter Subscribe"i'], query='the visible confirmation message in the Founder Newsletter form', expected_value='', needs_unit_conversion=False, operator='equals', transforms=['strip'], condition='Get the visible confirmation message after submitting and save it as {{confirmation_message}}.'))
    
    async with testmu.step('Assertion check', instruction_id='5ab56523-9ecb-4987-ad50-e2666b94322b'):
        await testmu.verify_assertion(page, 'Assertion check', {'operator': ['equals'], 'assertion_operands': [], 'left_operand': None, 'right_operand': None, 'operands': [], 'sub_results': [{'description': 'A visible confirmation message appears after submitting.', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{confirmation_message_visible}}', 'store_key': 'confirmation_message_visible', 'variable_refs': {'{{confirmation_message_visible}}': 'true'}}, {'description': 'The email field still holds the submitted value.', 'passed': True, 'operator': 'equals', 'transforms': ['strip'], 'json_path': None, 'expected': 'founder@example.com', 'extracted_value': '{{email_field_submitted_value}}', 'store_key': 'email_field_submitted_value', 'variable_refs': {'{{email_field_submitted_value}}': 'founder@example.com'}}], 'sub_checks': [{'description': 'A visible confirmation message appears after submitting.', 'store_key': 'confirmation_message_visible', 'expected_value': 'true', 'extracted_value': '{{confirmation_message_visible}}', 'operator': 'equals', 'transforms': []}, {'description': 'The email field still holds the submitted value.', 'store_key': 'email_field_submitted_value', 'expected_value': 'founder@example.com', 'extracted_value': '{{email_field_submitted_value}}', 'operator': 'equals', 'transforms': ['strip']}], 'composite_operator': 'and', 'claim': 'A visible confirmation message appears after submitting, and the email field still holds the submitted value.'})


if __name__ == "__main__":
    testmu.run(test)