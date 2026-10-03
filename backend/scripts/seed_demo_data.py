"""
Seed realistic demo notes into EchoMemo MongoDB Atlas database with Gemini embeddings.
"""

import asyncio
import os
import sys
from datetime import datetime, timezone

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import connect_db, close_db, get_database
from app.core.security import hash_password
from app.services.notes_service import create_note
from app.services.embedding_service import create_note_chunks
from bson import ObjectId


SAMPLE_NOTES = [
    {
        "title": "Project Apollo Architecture & Tech Stack",
        "tags": ["work", "architecture", "tech"],
        "capture_type": "text",
        "body": (
            "Architecture decision for Project Apollo: We selected FastAPI with MongoDB Atlas for persistent "
            "and vector storage, paired with ElevenLabs for voice synthesis and STT transcription. Target response "
            "latency is under 200ms for voice notes. We are using Gemini 3.8 Flash for RAG and semantic Q&A due to "
            "its low latency and fast retrieval grounded in user notes."
        )
    },
    {
        "title": "Q3 Budget Review & Cloud Costs",
        "tags": ["finance", "budget", "planning"],
        "capture_type": "text",
        "body": (
            "Q3 Budget Review Summary: Cloud hosting allocation is $1,200/month. The AI inference budget "
            "(Gemini + ElevenLabs) is set to $850/month. We established a reserve contingency fund of $5,000 "
            "for unexpected traffic spikes. Financial audit review date is October 15th with Sarah from accounting."
        )
    },
    {
        "title": "Ethiopian Yirgacheffe V60 Pour-Over Recipe",
        "tags": ["personal", "hobbies", "coffee"],
        "capture_type": "text",
        "body": (
            "Dialed-in recipe for Ethiopian Yirgacheffe on the Hario V60 dripper: "
            "Dose: 18g coffee ground medium-fine. Water: 300g filtered water at 93°C (1:16.6 ratio). "
            "Step 1: 45-second bloom with 50g water. Step 2: Gentle spiral pour to 175g. Step 3: Second pour to 300g. "
            "Total drawdown time should finish at 2 minutes 45 seconds. Produces clean floral notes with bergamot and peach."
        )
    },
    {
        "title": "Meeting with Dr. Aris: Clinical Trial Milestones",
        "tags": ["meetings", "health", "ai"],
        "capture_type": "text",
        "body": (
            "Discussed clinical trials timeline with Dr. Aris on Wednesday. Phase 1 enrollment target is 150 patients "
            "across 3 research clinics. Key milestone: Ethics board approval is expected by November 12th. "
            "Action item: Send Dr. Aris our HIPAA compliance, audio retention privacy policy, and encryption spec by Friday."
        )
    },
    {
        "title": "Japan Vacation Itinerary (Tokyo & Kyoto)",
        "tags": ["travel", "japan", "vacation"],
        "capture_type": "text",
        "body": (
            "Japan Travel Plan (April 2026): Days 1-4 in Tokyo (staying in Shinjuku, visiting TeamLab Planets in Toyosu, "
            "Ghibli Museum in Mitaka, and Tsukiji Outer Market for fresh sushi). Days 5-8 in Kyoto (visiting Fushimi Inari "
            "shrine at 6:00 AM to avoid crowds, Arashiyama Bamboo Grove, dinner reservation at Monk on April 18th). "
            "Flight: ANA Flight NH105 departing SFO at 11:30 AM. Shinkansen tickets booked on 7-day JR Pass."
        )
    },
    {
        "title": "Book Insights: Designing Data-Intensive Applications",
        "tags": ["books", "learning", "engineering"],
        "capture_type": "text",
        "body": (
            "Key takeaways from DDIA Chapter 7 on Transactions: ACID definitions vary widely between vendors. "
            "Snapshot isolation prevents read skew and phantom reads using MVCC (multi-version concurrency control). "
            "Default Read Committed isolation is vulnerable to write skew anomalies, which require serializable isolation "
            "or explicit row locks to prevent."
        )
    },
    {
        "title": "Home Reference & Emergency Info",
        "tags": ["home", "reference"],
        "capture_type": "text",
        "body": (
            "Important home reference info: Router IP is 192.168.1.1. Guest Wi-Fi SSID is 'EchoGuest' with password "
            "'CoffeeGuest2026'. The main water shutoff valve is located directly under the kitchen sink on the right side. "
            "Landlord emergency maintenance contact: +1-555-0199. Spare apartment key is with downstairs neighbor Mrs. Gable in unit 2B."
        )
    },
    {
        "title": "Weekly Gym Workout & Hypertrophy Split",
        "tags": ["fitness", "health", "workout"],
        "capture_type": "text",
        "body": (
            "Current 4-day workout routine: Monday: Upper Body (Bench Press 4x6 @ 80kg, Barbell Rows 4x8, Overhead Press 3x10). "
            "Tuesday: Lower Body (Squats 4x6 @ 110kg, Romanian Deadlifts 3x10, Bulgarian Split Squats). "
            "Thursday: Push/Pull Hypertrophy (Incline Dumbbell Press 3x10, Lat Pulldowns 4x10, Lateral Raises 4x15). "
            "Friday: Legs & Core. Rest on Wednesday and weekends."
        )
    },
    {
        "title": "Vehicle Maintenance & Insurance Details",
        "tags": ["vehicle", "auto", "reference"],
        "capture_type": "text",
        "body": (
            "Vehicle details for Honda Civic EX 2021: License plate is 7XYZ892. Recommended tire pressure is 32 PSI cold. "
            "Engine oil specification is 0W-20 Full Synthetic. Next scheduled service is the 45,000-mile B12 service. "
            "Auto insurance provider: GEICO, Policy #9042-88102, renewal date is December 1st, roadside assistance number: 1-800-841-3000."
        )
    },
    {
        "title": "Artisan Sourdough Bread Recipe & Schedule",
        "tags": ["cooking", "baking", "food"],
        "capture_type": "text",
        "body": (
            "Master sourdough loaf formula (75% hydration): 400g bread flour, 50g whole wheat flour, 335g water at 28°C, "
            "90g active sourdough starter (100% hydration), 9g fine sea salt. Autolyse flour and water for 45 minutes. "
            "Add starter and salt. Bulk fermentation: 4.5 hours with 4 sets of stretch-and-folds every 30 minutes. "
            "Cold retard in banneton overnight in fridge (12-16 hours). Bake in preheated Dutch oven at 230°C (20 min lid on, 22 min lid off)."
        )
    },
    {
        "title": "Mom's 60th Birthday Celebration & Gift Ideas",
        "tags": ["personal", "family", "gifts"],
        "capture_type": "text",
        "body": (
            "Mom's 60th Birthday celebration plans: Date is Saturday, June 20th. Venue shortlisted: Meadowlark Botanical Gardens Pavilion. "
            "Catering: Italian antipasti and dessert table by Lucia's Bakery. "
            "Gift ideas: 1) Cashmere wrap cardigan from Everlane in Oatmeal color (size M). 2) Japanese carbon-steel bypass pruners from Niwaki. "
            "3) Custom engraved photo album with pictures from our 2025 family reunion in Lake Tahoe."
        )
    },
    {
        "title": "Annual Health Checkup & Bloodwork Summary",
        "tags": ["health", "medical", "wellness"],
        "capture_type": "text",
        "body": (
            "Summary from annual checkup with Dr. Rachel Patel: Blood pressure reading was optimal at 118/74 mmHg. "
            "Fasting blood glucose: 86 mg/dL. Total cholesterol: 172 mg/dL (HDL 58, LDL 98). "
            "Serum Vitamin D was borderline low at 22 ng/mL. Doctor recommendation: take 2,000 IU Vitamin D3 daily with fatty meal. "
            "Schedule next routine dental cleaning for November 4th with Dr. Miller."
        )
    },
    {
        "title": "Tax Filing Checklist & Business Deductions",
        "tags": ["finance", "taxes", "freelance"],
        "capture_type": "text",
        "body": (
            "Tax preparation checklist for CPA David Chen (Chen & Partners CPA): "
            "Quarterly estimated tax payments due: April 15, June 15, September 15, and January 15. "
            "Eligible home office deductions: 190 sq ft dedicated office space (approx 18% of total apartment area), "
            "fiber internet bills (50% business allocation), and new Herman Miller Aeron chair purchased for $1,150. "
            "1099-NEC forms need to be sent out to contractors before January 31."
        )
    }
]


async def seed():
    print("=" * 60)
    print("Connecting to MongoDB Atlas...")
    await connect_db()
    db = get_database()

    # 1. Ensure demo user exists
    demo_email = "demo@echomemo.ai"
    demo_pass = "EchoMemo2026!"
    demo_name = "Alex Mercer"

    user = await db.users.find_one({"email_normalized": demo_email})
    if not user:
        print(f"Creating demo user: {demo_email}...")
        now = datetime.now(timezone.utc)
        user_doc = {
            "email_normalized": demo_email,
            "password_hash": hash_password(demo_pass),
            "name": demo_name,
            "created_at": now,
            "settings": {
                "audio_retention": False,
                "playback_speed": 1.0,
            },
            "deletion_status": None,
        }
        res = await db.users.insert_one(user_doc)
        user_id = str(res.inserted_id)
        print(f"Created demo user with ID: {user_id}")
    else:
        user_id = str(user["_id"])
        print(f"Found existing demo user ({demo_email}) with ID: {user_id}")

    # Also check if any other user signed up recently
    all_users = await db.users.find({}).to_list(length=10)
    user_ids_to_seed = [user_id]
    for u in all_users:
        uid = str(u["_id"])
        if uid not in user_ids_to_seed:
            user_ids_to_seed.append(uid)
            print(f"Will also seed for user: {u.get('email_normalized', uid)}")

    # 2. Seed notes and embeddings
    for target_uid in user_ids_to_seed:
        print(f"\n--- Seeding notes for user: {target_uid} ---")
        for item in SAMPLE_NOTES:
            # Check if note already exists for this user by title
            existing_note = await db.notes.find_one({
                "user_id": ObjectId(target_uid),
                "title": item["title"],
            })
            if existing_note:
                note_id = str(existing_note["_id"])
                await db.notes.update_one(
                    {"_id": existing_note["_id"]},
                    {"$set": {"body": item["body"], "tags": item["tags"]}}
                )
                print(f"  [Updated] {item['title']}")
            else:
                note = await create_note(
                    user_id=target_uid,
                    title=item["title"],
                    body=item["body"],
                    capture_type=item["capture_type"],
                    tags=item["tags"],
                )
                note_id = str(note["_id"])
                print(f"  [Created] {item['title']} (ID: {note_id})")

            # Always ensure embeddings exist
            print(f"    -> Generating Gemini embedding...")
            success = await create_note_chunks(
                note_id=note_id,
                user_id=target_uid,
                title=item["title"],
                body=item["body"],
            )
            print(f"    -> Embedding created: {success}")

    print("\n" + "=" * 60)
    print("Demo Data Seeding Complete!")
    print(f"Demo Credentials:")
    print(f"  Email:    {demo_email}")
    print(f"  Password: {demo_pass}")
    print("=" * 60)

    await close_db()


if __name__ == "__main__":
    asyncio.run(seed())
