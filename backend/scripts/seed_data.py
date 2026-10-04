"""
seed_data.py - EchoMemo demo seed for an engineering student persona.

Usage (from backend/ dir):
    python scripts/seed_data.py

What it does:
  1. Drops ALL existing data (users, notes, tasks, note_chunks, refresh_tokens)
  2. Creates one demo user:  arjun.sharma@iitb.ac.in  /  Demo@1234
  3. Seeds 12 rich notes (text + voice) with full AI inbox_metadata
  4. Seeds 14 tasks spread across priority / status / due-date buckets
"""

import asyncio
import sys
import os
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME   = os.getenv("MONGODB_DATABASE", "echomemo")


def now(delta_days=0):
    return datetime.now(timezone.utc) + timedelta(days=delta_days)

def iso(dt):
    return dt.isoformat()

def future(days):
    return iso(now(days))

def past(days):
    return iso(now(-days))


def imeta(title, summary, classification, tags, items, review="pending"):
    return {
        "ai_title": title,
        "summary": summary,
        "classification": classification,
        "suggested_tags": tags,
        "extracted_items": items,
        "processing_status": "completed",
        "review_status": review,
        "processed_at": iso(now(-1)),
        "error_message": None,
    }


def item(itype, ititle, desc=None, due=None, priority="medium",
         conf=0.88, ambiguous=False, status="pending"):
    return {
        "type": itype,
        "title": ititle,
        "description": desc,
        "due_date": due,
        "priority": priority,
        "confidence": conf,
        "date_ambiguous": ambiguous,
        "status": status,
    }


async def seed():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]

    print("Dropping all existing data...")
    await db.users.drop()
    await db.notes.drop()
    await db.tasks.drop()
    await db.note_chunks.drop()
    await db.refresh_tokens.drop()
    print("  Collections cleared")

    await db.users.create_index("email_normalized", unique=True)
    await db.notes.create_index([("user_id", 1), ("created_at", -1)])
    await db.notes.create_index([("title", "text"), ("body", "text")])
    await db.note_chunks.create_index([("user_id", 1), ("note_id", 1)])
    await db.notes.create_index([("user_id", 1), ("inbox_metadata.processing_status", 1)])
    await db.tasks.create_index([("user_id", 1), ("status", 1), ("due_date", 1)])
    await db.tasks.create_index([("user_id", 1), ("created_at", -1)])
    await db.tasks.create_index(
        [("user_id", 1), ("source_note_id", 1), ("source_item_index", 1)],
        unique=True,
        partialFilterExpression={
            "source_note_id": {"$type": "objectId"},
            "source_item_index": {"$type": "number"},
        },
    )
    print("  Indexes recreated")

    # ── User ──────────────────────────────────────────────────────────────────
    pw_hash = bcrypt.hashpw("Demo@1234".encode(), bcrypt.gensalt()).decode()
    user_doc = {
        "email": "arjun.sharma@iitb.ac.in",
        "email_normalized": "arjun.sharma@iitb.ac.in",
        "name": "Arjun Sharma",
        "password_hash": pw_hash,
        "created_at": now(-45),
        "updated_at": now(-1),
        "settings": {},
    }
    user_res = await db.users.insert_one(user_doc)
    uid = user_res.inserted_id
    print(f"  User created: arjun.sharma@iitb.ac.in / Demo@1234")

    # ── Notes ─────────────────────────────────────────────────────────────────
    notes_data = [
        {
            "title": "OS Lecture - Process Scheduling",
            "body": (
                "So prof covered round robin and priority scheduling today. "
                "Round robin has time quantum and context switch overhead. "
                "Need to submit the OS assignment by Friday - implement a priority queue in C. "
                "Also the mid-sem is on the 15th, need to revise virtual memory and paging. "
                "Reminder: borrow Tanenbaum from the library before Thursday."
            ),
            "capture_type": "voice",
            "tags": ["os", "lecture", "assignment"],
            "inbox_metadata": imeta(
                "OS Lecture - Scheduling and Upcoming Deadlines",
                "Covered Round Robin and Priority Scheduling. Two key deadlines: OS assignment (priority queue in C) due Friday, and mid-sem exam on the 15th covering virtual memory and paging.",
                "task",
                ["os", "scheduling", "assignment", "exam"],
                [
                    item("task", "Implement priority queue scheduler in C for OS assignment",
                         "Use min-heap. Refer CLRS Chapter 6.", future(3), "high", 0.95),
                    item("task", "Revise virtual memory and paging for mid-sem",
                         None, future(12), "high", 0.90),
                    item("reminder", "Borrow Tanenbaum from IIT library before Thursday",
                         None, future(2), "medium", 0.82, True),
                ],
            ),
            "created_at": now(-2),
        },
        {
            "title": "Project Team Standup - EV Battery Monitor",
            "body": (
                "Meeting with Priya and Rohan. Hardware prototype needs to be ready by next Monday. "
                "Priya will handle the BMS firmware, Rohan is on the dashboard frontend. "
                "I need to write the I2C driver for the fuel gauge IC. "
                "Client demo is 2 weeks from now - we need slides too. "
                "Action: push all changes to GitHub by Sunday night."
            ),
            "capture_type": "voice",
            "tags": ["project", "ev", "hardware", "team"],
            "inbox_metadata": imeta(
                "EV Battery Monitor - Sprint Standup",
                "Hardware prototype deadline is Monday. Responsibilities: Priya on BMS firmware, Rohan on frontend, Arjun on I2C fuel gauge driver. Client demo in 2 weeks. GitHub deadline: Sunday.",
                "meeting",
                ["ev-project", "hardware", "i2c", "sprint"],
                [
                    item("task", "Write I2C driver for fuel gauge IC (MAX17048)",
                         "Use STM32 HAL. Reference datasheet pg 12.", future(5), "high", 0.97),
                    item("task", "Push all EV project changes to GitHub",
                         None, future(3), "medium", 0.91),
                    item("task", "Prepare client demo slides for EV battery monitor",
                         "Use Canva template from last semester.", future(14), "high", 0.88),
                ],
            ),
            "created_at": now(-3),
        },
        {
            "title": "Research Idea: RL for DVFS Optimization",
            "body": (
                "Idea: use deep reinforcement learning to dynamically tune DVFS "
                "on ARM Cortex processors. State space: IPC, temperature, workload type. "
                "Reward function: minimize energy while keeping performance above threshold. "
                "Could extend Prof. Mehta lab work. Email him this week to discuss. "
                "Potential venue: DATE 2025 or ISCA - submission deadline around October end."
            ),
            "capture_type": "text",
            "tags": ["research", "rl", "dvfs", "paper"],
            "inbox_metadata": imeta(
                "Research Idea: RL-based DVFS on ARM",
                "Apply deep RL to DVFS optimization on ARM Cortex, minimizing energy while maintaining performance. Target: DATE 2025 or ISCA. Immediate action: contact Prof. Mehta.",
                "idea",
                ["research", "deep-rl", "dvfs", "arm", "paper"],
                [
                    item("task", "Email Prof. Mehta about RL-DVFS research collaboration",
                         None, future(5), "high", 0.93),
                    item("task", "Draft 2-page research proposal for RL-DVFS idea",
                         "Cover motivation, approach, expected results.", future(20), "medium", 0.85),
                    item("reminder", "Check DATE 2025 paper submission deadline",
                         None, future(7), "medium", 0.79, True),
                ],
            ),
            "created_at": now(-5),
        },
        {
            "title": "DBMS Lab - ER Diagram and Queries",
            "body": (
                "Lab submission was supposed to be yesterday. "
                "Need to finish the ER diagram for the hospital management schema and write 10 SQL queries. "
                "Also need to normalize to 3NF. Talk to TA Sneha - maybe she can extend the deadline. "
                "Submit via the lab portal, not email."
            ),
            "capture_type": "text",
            "tags": ["dbms", "lab", "sql"],
            "inbox_metadata": imeta(
                "DBMS Lab - Overdue ER Diagram and SQL Submission",
                "DBMS lab submission is overdue. Needs ER diagram for hospital schema, 10 SQL queries, and 3NF normalization. Contact TA Sneha about deadline extension. Submit via lab portal.",
                "task",
                ["dbms", "lab", "sql", "overdue"],
                [
                    item("task", "Complete ER diagram for hospital management schema",
                         "Use draw.io. Include all relationships.", past(1), "high", 0.96),
                    item("task", "Write 10 SQL queries and normalize to 3NF for DBMS lab",
                         None, past(1), "high", 0.94),
                    item("task", "Email TA Sneha about DBMS lab deadline extension",
                         None, past(1), "medium", 0.87, False, "accepted"),
                ],
            ),
            "created_at": now(-6),
        },
        {
            "title": "Weekly Reflection - Semester 6 Week 4",
            "body": (
                "This week was intense. Got 78% on the CN quiz - need to focus on TCP congestion control. "
                "Feeling behind on the EV project. The I2C driver is taking longer than expected. "
                "Gym three times this week which was good. "
                "Goal for next week: finish the driver, start ML assignment, and review OS notes before Thursday lab. "
                "Also apply for the GSOC mentorship program - application closes next Friday."
            ),
            "capture_type": "text",
            "tags": ["journal", "weekly", "reflection"],
            "inbox_metadata": imeta(
                "Week 4 Reflection - Goals and Action Items",
                "Productive but challenging week. 78% on CN quiz, behind on EV project. Next week: finish I2C driver, start ML assignment, revise OS notes, apply to GSOC by Friday.",
                "journal",
                ["journal", "weekly-review", "goals"],
                [
                    item("task", "Apply to GSOC mentorship program before deadline",
                         "Visit summerofcode.withgoogle.com", future(5), "high", 0.91),
                    item("task", "Start ML assignment - regression models",
                         None, future(4), "medium", 0.84),
                    item("reminder", "Review OS notes before Thursday lab",
                         None, future(3), "low", 0.78, True),
                ],
            ),
            "created_at": now(-7),
        },
        {
            "title": "Internship Prep - DSA Patterns Cheatsheet",
            "body": (
                "Key patterns for placements:\n"
                "1. Sliding Window - substring/subarray problems\n"
                "2. Two Pointer - sorted arrays, linked lists\n"
                "3. Fast and Slow pointer - cycle detection\n"
                "4. Merge Intervals - calendar, meeting rooms\n"
                "5. Top K Elements - heap usage\n"
                "6. Binary Search variants - rotated array, first/last occurrence\n"
                "Practice: LeetCode Blind 75 + NeetCode roadmap. Target 3 problems/day. "
                "Mock interview scheduled with Priya on Saturday 10am."
            ),
            "capture_type": "text",
            "tags": ["dsa", "placement", "interview", "cheatsheet"],
            "inbox_metadata": imeta(
                "DSA Patterns for Placement Prep",
                "6 key DSA patterns: Sliding Window, Two Pointer, Fast/Slow Pointer, Merge Intervals, Top K (Heap), Binary Search. Practice: 3 LeetCode problems/day, mock interview Saturday.",
                "reference",
                ["dsa", "placement", "algorithms", "cheatsheet"],
                [
                    item("task", "Complete LeetCode Blind 75 - 3 problems per day",
                         "Start with Arrays and Hashing section.", future(25), "high", 0.89),
                    item("reminder", "Mock interview with Priya - Saturday 10am",
                         None, future(4), "high", 0.96, False, "accepted"),
                ],
            ),
            "created_at": now(-8),
        },
        {
            "title": "CN Exam Prep - Voice Memo",
            "body": (
                "Okay so for Computer Networks I need to cover: TCP sliding window, "
                "IP fragmentation, DNS resolution, BGP routing, and HTTPS TLS handshake. "
                "The exam is on the 18th. "
                "Find the Kurose Ross textbook PDF - chapter 3 and 4 are most important. "
                "Make flashcards for OSI vs TCP/IP model differences. "
                "Watch the playlist on YouTube - Prof. Srinivas CN lectures."
            ),
            "capture_type": "voice",
            "tags": ["cn", "exam", "networking"],
            "inbox_metadata": imeta(
                "CN Exam Prep Plan - Key Topics and Study Plan",
                "CN exam on the 18th. Study plan covers TCP, IP, DNS, BGP, TLS. Resources: Kurose Ross Ch 3-4, OSI/TCP flashcards, YouTube lecture series by Prof. Srinivas.",
                "task",
                ["computer-networks", "exam-prep", "tcp-ip"],
                [
                    item("task", "Study TCP sliding window and IP fragmentation for CN exam",
                         "Kurose Ross Ch 3. Make structured notes.", future(10), "high", 0.94),
                    item("task", "Make flashcards for OSI vs TCP/IP model",
                         None, future(8), "medium", 0.87),
                    item("task", "Watch Prof. Srinivas CN YouTube lecture series",
                         None, future(7), "low", 0.80),
                ],
            ),
            "created_at": now(-4),
        },
        {
            "title": "Hackathon Idea - Campus Lost and Found App",
            "body": (
                "Build a campus-specific lost and found app using computer vision. "
                "Upload photo of lost item, model identifies category and matches with found items. "
                "Stack: React Native + FastAPI + MongoDB + CLIP embeddings for image similarity. "
                "Could submit to Techfest 2025 hackathon. Team: Me, Priya, Vivek. "
                "Need to register by Oct 10. Prize pool is 1 lakh rupees!"
            ),
            "capture_type": "text",
            "tags": ["hackathon", "idea", "cv", "startup"],
            "inbox_metadata": imeta(
                "Hackathon Idea: AI Lost and Found for Campus",
                "CV-powered lost and found app using CLIP embeddings. Stack: React Native + FastAPI + MongoDB. Team of 3. Register for Techfest 2025 by Oct 10 (prize: 1 lakh).",
                "idea",
                ["hackathon", "computer-vision", "clip", "react-native"],
                [
                    item("task", "Register team for Techfest 2025 hackathon",
                         "Arjun + Priya + Vivek. Deadline Oct 10.", future(7), "high", 0.98, False, "accepted"),
                    item("task", "Build CLIP-based image similarity prototype for lost and found",
                         "Use HuggingFace CLIP model.", future(21), "medium", 0.86),
                    item("task", "Set up React Native and FastAPI backend skeleton",
                         None, future(14), "medium", 0.83),
                ],
            ),
            "created_at": now(-1),
        },
        {
            "title": "Linux Terminal Commands Cheatsheet",
            "body": (
                "grep -r 'pattern' /path - recursive search\n"
                "find / -name 'file.txt' -type f - find files\n"
                "awk '{print $2}' file - print column\n"
                "sed -i 's/old/new/g' file - replace in file\n"
                "ps aux | grep process - find process\n"
                "netstat -tulnp - list open ports\n"
                "strace ./program - trace system calls\n"
                "tmux new-session - terminal multiplexer\n"
                "chmod +x script.sh && ./script.sh - run script"
            ),
            "capture_type": "text",
            "tags": ["linux", "terminal", "cheatsheet"],
            "inbox_metadata": None,
            "created_at": now(-10),
        },
        {
            "title": "Google Internship Application - Summer 2025",
            "body": (
                "The Google STEP internship applications opened today. "
                "I need to update my resume - add the EV project and the GSOC contribution. "
                "The application needs a statement of purpose, around 500 words. "
                "Deadline is October 30th. Also apply for Microsoft Explore and Amazon SDE intern. "
                "Ask seniors for referrals - Ayaan from batch 2022 works at Google Bangalore. "
                "Brush up system design basics before interviews."
            ),
            "capture_type": "voice",
            "tags": ["internship", "placement", "google", "resume"],
            "inbox_metadata": imeta(
                "Internship Application Plan - Google STEP and Others",
                "Google STEP, Microsoft Explore, Amazon SDE intern applications open. Deadline Oct 30. Update resume with EV project and GSOC. Write 500-word SOP. Contact Ayaan at Google Bangalore for referral.",
                "reminder",
                ["internship", "placement", "google", "resume", "sop"],
                [
                    item("task", "Update resume with EV project and GSOC contribution",
                         "Use Overleaf Jake Ryan template. Keep to 1 page.", future(3), "high", 0.96, False, "accepted"),
                    item("task", "Write 500-word Statement of Purpose for Google STEP",
                         "Focus on impact and technical skills.", future(7), "high", 0.93),
                    item("task", "Apply to Microsoft Explore and Amazon SDE intern programs",
                         None, future(20), "medium", 0.88),
                    item("reminder", "Message Ayaan on LinkedIn for Google referral",
                         None, future(2), "high", 0.91, False, "accepted"),
                ],
            ),
            "created_at": now(-1),
        },
        {
            "title": "Prof. Mehta Meeting - Minor Project Review",
            "body": (
                "Met with Prof. Mehta today for the minor project check-in. "
                "He wants the literature survey done by next week. "
                "Suggested adding Bayesian optimization as a baseline comparison to the RL approach. "
                "Send him a draft by Wednesday for feedback. "
                "He might include this work in his upcoming survey paper - need to keep him updated monthly. "
                "Lab access granted for Tuesdays 2-5pm."
            ),
            "capture_type": "text",
            "tags": ["research", "meeting", "professor", "minor-project"],
            "inbox_metadata": imeta(
                "Prof. Mehta Review - Literature Survey and Draft Deadline",
                "Prof. Mehta reviewed minor project. Key feedback: add Bayesian optimization baseline, submit draft by Wednesday. Potential inclusion in his survey paper. Lab access: Tuesdays 2-5pm.",
                "meeting",
                ["research", "minor-project", "prof-mehta", "bayesian"],
                [
                    item("task", "Complete literature survey for RL-DVFS minor project",
                         "Min 15 papers. Use Google Scholar and IEEE Xplore.", future(7), "high", 0.97),
                    item("task", "Send project draft to Prof. Mehta for feedback",
                         None, future(2), "high", 0.95),
                    item("task", "Add Bayesian optimization baseline to RL-DVFS model",
                         None, future(14), "medium", 0.88),
                ],
            ),
            "created_at": now(-9),
        },
        {
            "title": "Graph Algorithms - Quick Reference",
            "body": (
                "BFS - shortest path unweighted, level-order traversal\n"
                "DFS - detect cycles, topological sort, SCC\n"
                "Dijkstra - shortest path weighted (non-negative edges), O((V+E)logV)\n"
                "Bellman-Ford - negative edges allowed, O(VE)\n"
                "Floyd-Warshall - all-pairs shortest path, O(V^3)\n"
                "Prim/Kruskal - MST, O(ElogV)\n"
                "Tarjan SCC - O(V+E)\n"
                "Union-Find - disjoint set, path compression with rank\n\n"
                "Competitive programming tip: always check for disconnected graphs!"
            ),
            "capture_type": "text",
            "tags": ["algorithms", "graphs", "competitive-programming"],
            "inbox_metadata": imeta(
                "Graph Algorithms Reference Card",
                "Quick reference of key graph algorithms: BFS, DFS, Dijkstra, Bellman-Ford, Floyd-Warshall, Prim/Kruskal MST, Tarjan SCC, Union-Find with complexities and use cases.",
                "reference",
                ["graphs", "algorithms", "dsa", "competitive-programming"],
                [],
                "reviewed",
            ),
            "created_at": now(-12),
        },
    ]

    note_ids = {}
    for nd in notes_data:
        meta = nd.pop("inbox_metadata")
        created_at = nd.pop("created_at")
        doc = {
            "user_id": uid,
            "title": nd["title"],
            "body": nd["body"],
            "capture_type": nd["capture_type"],
            "tags": nd["tags"],
            "processing_status": "ready",
            "audio_object_key": None,
            "created_at": created_at,
            "updated_at": created_at,
        }
        if meta:
            doc["inbox_metadata"] = meta
        res = await db.notes.insert_one(doc)
        note_ids[nd["title"]] = res.inserted_id
        try:
            from app.services.embedding_service import create_note_chunks
            await create_note_chunks(str(res.inserted_id), str(uid), nd["title"], nd["body"])
        except Exception as embed_err:
            print(f"    Notice: could not embed {nd['title']}: {embed_err}")

    print(f"  {len(notes_data)} notes created and embedded")

    # ── Tasks ─────────────────────────────────────────────────────────────────
    os_nid    = note_ids["OS Lecture - Process Scheduling"]
    ev_nid    = note_ids["Project Team Standup - EV Battery Monitor"]
    dsa_nid   = note_ids["Internship Prep - DSA Patterns Cheatsheet"]
    hack_nid  = note_ids["Hackathon Idea - Campus Lost and Found App"]
    intern_nid = note_ids["Google Internship Application - Summer 2025"]
    dbms_nid  = note_ids["DBMS Lab - ER Diagram and Queries"]
    refl_nid  = note_ids["Weekly Reflection - Semester 6 Week 4"]
    res_nid   = note_ids["Research Idea: RL for DVFS Optimization"]
    prof_nid  = note_ids["Prof. Mehta Meeting - Minor Project Review"]

    def to_dt(val):
        if not val:
            return None
        if isinstance(val, datetime):
            return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
        try:
            d = datetime.fromisoformat(val.replace("Z", "+00:00"))
            return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
        except Exception:
            try:
                return datetime.strptime(val, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except Exception:
                return None

    def task(title, desc, status, priority, due, tags, category, src_id=None, src_title=None, completed=None):
        return {
            "user_id": uid,
            "title": title,
            "description": desc,
            "status": status,
            "priority": priority,
            "due_date": to_dt(due),
            "tags": tags,
            "category": category,
            "source_note_id": ObjectId(src_id) if src_id else None,
            "source_note_title": src_title,
            "created_at": now(-2),
            "updated_at": now(-1),
            "completed_at": to_dt(completed),
        }

    tasks = [
        # Overdue
        task("Submit DBMS lab ER diagram and SQL queries",
             "Hospital schema, 10 SQL queries, normalize to 3NF. Submit via lab portal.",
             "pending", "high", past(1), ["dbms", "lab"], "Academic", dbms_nid,
             "DBMS Lab - ER Diagram and Queries"),

        task("Email TA Sneha about DBMS lab deadline extension",
             None, "completed", "medium", past(1), ["dbms"], "Academic", dbms_nid,
             "DBMS Lab - ER Diagram and Queries", iso(now(-1))),

        # Due today
        task("Review OS scheduling notes before Thursday lab",
             "Focus on Round Robin, Priority, MLFQ. Prepare examples.",
             "pending", "high",
             iso(now().replace(hour=23, minute=59, second=0, microsecond=0)),
             ["os", "exam"], "Academic", os_nid, "OS Lecture - Process Scheduling"),

        task("Send project draft to Prof. Mehta",
             "Attach the 6-page draft PDF. Keep it concise and well-structured.",
             "pending", "high",
             iso(now().replace(hour=23, minute=59, second=0, microsecond=0)),
             ["research", "minor-project"], "Research", prof_nid,
             "Prof. Mehta Meeting - Minor Project Review"),

        # Upcoming - high priority
        task("Write I2C driver for MAX17048 fuel gauge IC",
             "Use STM32 HAL library. Reference datasheet pg 12-18. Test on dev board.",
             "pending", "high", future(3), ["ev-project", "hardware", "embedded"],
             "Project", ev_nid, "Project Team Standup - EV Battery Monitor"),

        task("Implement priority queue scheduler in C for OS assignment",
             "Use min-heap. Test with 5+ process scenarios. Comment all code.",
             "pending", "high", future(3), ["os", "c", "assignment"],
             "Academic", os_nid, "OS Lecture - Process Scheduling"),

        task("Apply to GSOC mentorship program before deadline",
             "Visit summerofcode.withgoogle.com. Prepare project proposal first.",
             "pending", "high", future(5), ["open-source", "gsoc"],
             "Placement", refl_nid, "Weekly Reflection - Semester 6 Week 4"),

        task("Email Prof. Mehta about RL-DVFS research collaboration",
             "Mention the ISCA/DATE paper angle. Ask for lab access extension.",
             "pending", "high", future(5), ["research", "email"],
             "Research", res_nid, "Research Idea: RL for DVFS Optimization"),

        task("Write 500-word Statement of Purpose for Google STEP",
             "Focus on EV project impact and open-source contributions. Get seniors to review.",
             "pending", "high", future(7), ["internship", "google", "sop"],
             "Placement", intern_nid, "Google Internship Application - Summer 2025"),

        task("Complete literature survey for RL-DVFS minor project",
             "Minimum 15 papers. Use Google Scholar and IEEE Xplore. Export to Zotero.",
             "pending", "high", future(7), ["research", "survey", "minor-project"],
             "Research", prof_nid, "Prof. Mehta Meeting - Minor Project Review"),

        task("Push EV project firmware and dashboard code to GitHub",
             "Write README with hardware setup instructions. Sunday deadline.",
             "pending", "medium", future(3), ["ev-project", "github"],
             "Project", ev_nid, "Project Team Standup - EV Battery Monitor"),

        task("Complete LeetCode Blind 75 - 3 problems per day",
             "Start with Arrays and Hashing. Track progress in a spreadsheet.",
             "pending", "medium", future(25), ["dsa", "leetcode", "placement"],
             "Placement", dsa_nid, "Internship Prep - DSA Patterns Cheatsheet"),

        # Completed
        task("Update resume with EV project and GSOC contribution",
             "Used Overleaf Jake Ryan template. Kept to 1 page. PDF exported.",
             "completed", "high", future(3), ["internship", "resume"],
             "Placement", intern_nid, "Google Internship Application - Summer 2025",
             iso(now(-1))),

        task("Register team for Techfest 2025 hackathon",
             "Team: Arjun + Priya + Vivek. Registered successfully. Prize: 1 lakh.",
             "completed", "high", future(7), ["hackathon", "techfest"],
             "Extracurricular", hack_nid, "Hackathon Idea - Campus Lost and Found App",
             iso(now(-1))),
    ]

    for t in tasks:
        await db.tasks.insert_one(t)

    print(f"  {len(tasks)} tasks created")
    print()
    print("=" * 58)
    print("  Seed complete!")
    print("=" * 58)
    print(f"  Login:     arjun.sharma@iitb.ac.in")
    print(f"  Password:  Demo@1234")
    print(f"  Notes:     {len(notes_data)}  (text + voice, with AI inbox metadata)")
    print(f"  Tasks:     {len(tasks)}  (overdue, today, upcoming, completed)")
    print("=" * 58)

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
