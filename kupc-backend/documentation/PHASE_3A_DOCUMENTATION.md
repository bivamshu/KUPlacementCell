What Phase 3 is and why it exists
Phase 2 answered: Who is this user? (users, login, roles, session)

Phase 3 answers: What datadoes KUPC store about students, companies, jobs, swipes, chat, etc?

The database is not just storage. IT defines what the product can do:
- Can a student have multiple resumes? -. table design decides
- Can a pending company post job? -. verification_status + jobs relationship 
What counts as a "match"? -> swipes + matches tables

Phase 3 is split on purpose:

3A - Design 
    What: Entities, attributes, relationships, normalization, ER diagram 
    Output: Agreed data model(no SQL yet) 

3B - Implementation 
    What: Migrations, indexes, RLS, seed data, repositories, tests
    Output: Runnable schema in Supabase

Core concepts(plain language) 

#ENTITY
A noun the system cares about as its own thing. 

Examples: Student, Job, Swipe, Message

Test: Does it have its own lifecycle(created/updated/deleted independently?) If yes it usually gets its own Table.

Attribute
A property of an entity --- becomes a column 
Example: Student.cgpa, Job.title, Swipe. direction

Table
How a database stores an entity: rows = records, columns = attributes. 

Primary key(PK)
The column(s) that uniquely identify one row.

KUPC uses UUID for most tables(gen_random_uuid()). students.id and companies.id are the same UUID as users.id(identity inheritance from Phase 2).

Foreign Key(FK)
A column that points to another table's PK, enforcing "this row belongs to / references that row"

Example: jobs.company_id -> companies.id means every job belongs to one comapny. 

Relationship
How two entities corrent: 

|Type |Meaning| KUPC Example.
One-to-one(1:1) | One A <-> One B | Match ,-. Conversation
One-to-many(1:N) | One A - many B | Company <-> many Jobs
Many-to-Many(M:N) | Many <-> Many B | Student <-> Skill --- needs a join table

Join table 
A table that only exists to link two entities, often with extra data on the link. 

Example: students_skills links student and skills and stoes proficiency.

SELECT jobs.title, companies.company_name
FROM jobs 
JOIN companies ON jobs.comapny_id = companies.id;

JOIN = match rows where FK = PK
LEFT JOIN = keep left rows even if no match on the right. 

Normalization 
Organizing data so each fact lives in exatly one place, avoiding update bugs. 

Bad(denormalizaed): companies.company_name once; jobs reference company_id. 

Normal form | rule | KUPC example 
1NF | Atomic values, no repeating groups | Skills in student_skills, not "Python, React"
2NF | Non-key columns depend on the whole PK | In student_skills, proficiency depends on (student_id, skill_id), not just one
3NF | No column depends on another non-key | Don't copy verification_status onto every jobs row

We target 3NF. Further forms (BCNF, 4NF) add complexity without much beenfit for KUPC's acces patterns. 

Constraints 
Catabase rules that hold even iff app code has bugs: 
- Not NULL --- required field
- UNIQUE --- no duplicates (ku_id, skills.name)
- CHECK --- allowed values(cgpa BETWEEN 0 and 4)