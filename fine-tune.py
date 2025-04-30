import time
from openai import OpenAI

# 1) initialize client (make sure OPENAI_API_KEY is in your environment)
client = OpenAI()

# 2) create the fine-tune job
job = client.fine_tuning.jobs.create(
    training_file="file-HbVnGXickCZkwJCKsWCpkF",
    validation_file="file-3wouWXqjpn3Kwr8BGNFtoz",
    model="gpt-4o-mini-2024-07-18",   # swap to the exact snapshot you’ve verified is fine-tunable
    suffix="interview-helper"         # this suffix shows up in the new model’s name
)
print("Started fine-tune job:", job["id"])

# 3) poll until it’s done (this loop checks every 30s)
while True:
    status = client.fine_tuning.jobs.retrieve(job["id"])
    state = status["status"]
    print(f"Status: {state}")
    if state in ("succeeded", "failed", "cancelled"):
        break
    time.sleep(30)

if state != "succeeded":
    raise RuntimeError(f"Fine-tune did not succeed: {state}")

ft_model = status["fine_tuned_model"]
print("✅ Fine-tuned model ready:", ft_model)

# 4) example of calling your new model
response = client.chat.completions.create(
    model=ft_model,
    messages=[
        {"role": "user", "content": "How should I walk into a frontend interview?"}
    ]
)
print("\nAssistant says:", response.choices[0].message.content)
