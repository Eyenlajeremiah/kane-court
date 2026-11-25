import os
import testmu
from testmu import expect, var, set_var
from playwright.async_api import Page

testmu.configure(
    build="9ea7c87f-9fd7-4c63-8284-615000c806d2",
    name="Newsletter Subscription Confirmation",
    tc_id="TC-75",
    network=os.getenv("NETWORK", "false").lower() == "true",
    variables={"confirmation_message_visible": "true", "email_field_submitted_value": "founder@example.com", "confirmation_message": "Thank you for subscribing! Your request has been received."},
    auto_heal_version="AH2",
    default_action_timeout_ms=60000,
    default_navigation_timeout_ms=60000,
    kane_run_v4=True,
)

@testmu.test
async def test(page: Page):
    async with testmu.step('Navigate to http://localhost:3000/t/atlas', instruction_id='f80b90e2-b896-4b7d-ad21-36dfa7901939'):
        await page.goto("http://localhost:3000/t/atlas")
    
    async with testmu.step('Waiting for Founder Newsletter subscription steps to queue', instruction_id='d9bc3e7d-4e7c-4dbf-acf2-a9e8022df3cc'):
        await page.wait_for_timeout(1000)
    
    async with testmu.step('Type "founder@example.com" into "Founder Newsletter"', instruction_id='a83c6fe3-c83a-45a1-be8b-51c6711657ab'):
        element_0 = page.locator("internal:role=textbox[name=\"Founder Newsletter\"i]")
        
        await testmu.fill(element_0, "founder@example.com")
    
    async with testmu.step('Clicking Subscribe to submit the form', instruction_id='4712076e-320c-4362-b981-c55ccebfffa6'):
        _loc_1 = page.locator("internal:role=button[name=\"Subscribe\"i]")
        
        await _loc_1.click()
    
    async with testmu.step('whether the green confirmation message below the Founder Newsletter Subscribe button is visible', instruction_id='a1a2b3ca-1a35-4ed0-89c1-39f0aa213fd6'):
        set_var('confirmation_message_visible', await testmu.vision_query(page, "whether the green confirmation message below the Founder Newsletter Subscribe button is visible", ""))
    
    async with testmu.step('Reading the submitted email field value'):
        set_var('email_field_submitted_value', await testmu.textual_analyzer(page, wrapped_js="(els) => {\n  const __m = {25: 0};\n  const el = (i) => els[__m[i]];\n  const __v = (el(25).value);\n  return (typeof __v === 'boolean' ? String(__v) : __v);\n}", locators=['internal:role=textbox[name="Founder Newsletter"i]'], query='the submitted email value in the Founder Newsletter email field', expected_value='founder@example.com', needs_unit_conversion=False, operator='equals', transforms=['strip'], condition='The email field still holds the submitted value.'))
    
    async with testmu.step('the visible confirmation message below the Founder Newsletter Subscribe button', instruction_id='2d3dc68d-6343-4f86-8951-6b4d5f27dcd3'):
        set_var('confirmation_message', await testmu.vision_query(page, "the visible confirmation message below the Founder Newsletter Subscribe button", ""))
    
    async with testmu.step('Assertion check', instruction_id='a68aba84-9bc1-490d-8a97-2bd101ddc1b8'):
        await testmu.verify_assertion(page, 'Assertion check', {'operator': ['equals'], 'assertion_operands': [], 'left_operand': None, 'right_operand': None, 'operands': [], 'sub_results': [{'description': 'A visible confirmation message appears after submitting.', 'passed': True, 'operator': 'equals', 'transforms': [], 'json_path': None, 'expected': 'true', 'extracted_value': '{{confirmation_message_visible}}', 'store_key': 'confirmation_message_visible', 'variable_refs': {'{{confirmation_message_visible}}': 'true'}}, {'description': 'The email field still holds the submitted value.', 'passed': True, 'operator': 'equals', 'transforms': ['strip'], 'json_path': None, 'expected': 'founder@example.com', 'extracted_value': '{{email_field_submitted_value}}', 'store_key': 'email_field_submitted_value', 'variable_refs': {'{{email_field_submitted_value}}': 'founder@example.com'}}], 'sub_checks': [{'description': 'A visible confirmation message appears after submitting.', 'store_key': 'confirmation_message_visible', 'expected_value': 'true', 'extracted_value': '{{confirmation_message_visible}}', 'operator': 'equals', 'transforms': []}, {'description': 'The email field still holds the submitted value.', 'store_key': 'email_field_submitted_value', 'expected_value': 'founder@example.com', 'extracted_value': '{{email_field_submitted_value}}', 'operator': 'equals', 'transforms': ['strip']}], 'composite_operator': 'and', 'claim': 'A visible confirmation message appears after submitting, and the email field still holds the submitted value.'})


if __name__ == "__main__":
    testmu.run(test)