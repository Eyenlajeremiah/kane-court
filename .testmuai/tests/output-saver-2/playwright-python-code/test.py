import os
import testmu
from testmu import expect, var, set_var
from playwright.async_api import Page

testmu.configure(
    build="f1ad0728-9074-461c-8b6f-de25e69e06bc",
    name="Newsletter Subscription Confirmation",
    tc_id="TC-99",
    network=os.getenv("NETWORK", "false").lower() == "true",
    variables={"confirmation_message": "Thank you for subscribing! Your request has been received."},
    auto_heal_version="AH2",
    default_action_timeout_ms=60000,
    default_navigation_timeout_ms=60000,
    kane_run_v4=True,
)

@testmu.test
async def test(page: Page):
    async with testmu.step('Navigate to http://localhost:3000/t/atlas', instruction_id='ffde3b92-7d86-431d-a38f-0dd54f85a6d0'):
        await page.goto("http://localhost:3000/t/atlas")
    
    async with testmu.step('Waiting for the queued plan to start running', instruction_id='a0d2a38b-3e09-447f-b291-584dde1a9fc2'):
        await page.wait_for_timeout(1000)
    
    async with testmu.step('Type "founder@example.com" into "Founder Newsletter"', instruction_id='af8a54f2-7d10-4f79-9ba7-183e105c35de'):
        element_0 = page.locator("internal:role=textbox[name=\"Founder Newsletter\"i]")
        
        await testmu.fill(element_0, "founder@example.com")
    
    async with testmu.step('Clicking the Subscribe button to submit the form', instruction_id='b32a9376-c52c-47a4-9249-3bb22345df97'):
        _loc_1 = page.locator("internal:role=button[name=\"Subscribe\"i]")
        
        await _loc_1.click()
    
    async with testmu.step('the visible confirmation message below the Founder Newsletter subscription form', instruction_id='733cb79e-f956-437e-bea6-fb854d6f3d2a'):
        set_var('confirmation_message', await testmu.vision_query(page, "the visible confirmation message below the Founder Newsletter subscription form", ""))


if __name__ == "__main__":
    testmu.run(test)