import asyncio, os
from dotenv import load_dotenv
load_dotenv('backend/.env')
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db = client[os.getenv('DB_NAME', 'apextrainer')]
    students = await db.students.find().to_list(10)
    print("Emails dos alunos:")
    for s in students:
        print(f"- {s.get('name')}: {s.get('email')} (Has password: {'password_hash' in s})")

if __name__ == "__main__":
    asyncio.run(run())
