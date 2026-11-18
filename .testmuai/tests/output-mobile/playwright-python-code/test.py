import os
import testmu
from testmu import expect, var, set_var
from playwright.async_api import Page

testmu.configure(
    build="e45023bf-593e-4010-9532-6d1ea55c910f",
    name="Verify Mobile Viewport Layout",
    tc_id="TC-23",
    network=os.getenv("NETWORK", "false").lower() == "true",
    auto_heal_version="AH2",
    default_action_timeout_ms=60000,
    default_navigation_timeout_ms=60000,
    kane_run_v4=True,
)

@testmu.test
async def test(page: Page):
    async with testmu.step('Navigate to http://localhost:3000/t/atlas', instruction_id='0df66dd1-f3e8-4ab6-8961-deff72cbba05'):
        await page.goto("http://localhost:3000/t/atlas")


if __name__ == "__main__":
    testmu.run(test)