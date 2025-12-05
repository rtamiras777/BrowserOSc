go to agent mode set a new "button" called " Onboard me"
The button should navigate to https://ravi-dev.ciroos.ai/onboarding-flow
from there click continue
Then click start cloud onboarding
Then click add cloud connection
Prompt user to fill out role name and slect services (with human input tool) then click next
click download on the generated 
template file 
then click next

then open a new tab with this:
https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/template

Then click upload a template file on there and instruct user to upload file just downloaded and click through until completed with AWS steps 

then have a human input tool that clicks yes when the stack is submitted and from there 
find:Configuration Name *

My AWS Account
A friendly name for this AWS account configuration

AWS Account ID *

123456789012
Your 12-digit AWS account ID (e.g., 123456789012)

Role ARN *

arn:aws:iam::123456789012:role/CiroosReadOnlyRole
The ARN of the IAM role you created in the previous step

Tags (Optional)

Tag Key
and fill it into the ravi-dev.ciroos previous tab

