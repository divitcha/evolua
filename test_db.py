import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test_db():
    for url_id in ['ilk8qxr', '1lk8qxr', 'llk8qxr', 'llk8qxr', 'I1k8qxr', 'l1k8qxr', 'llk8qxr']:
        print(f"Testing {url_id}...")
        url = f"mongodb+srv://divanicesilva_db_user:DWQjdrepSndn0cjp@cluster0.{url_id}.mongodb.net/?retryWrites=true"
        client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=2000)
        try:
            await client.server_info()
            print(f"SUCCESS: {url_id}")
            return
        except Exception as e:
            pass
    print("None worked.")

asyncio.run(test_db())
