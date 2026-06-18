const url = "https://esjzitabjftwiqjzjttw.supabase.co/functions/v1/decode-jd";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzanppdGFiamZ0d2lxanpqdHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzA2NTQsImV4cCI6MjA4OTkwNjY1NH0.rF4FNw2X94XEkl4Vm7XyrnbXF1m1rtyGdV9Wbdh7lXE";

const jdText = `Apply for this job
Data Scientist / Data Engineer – “Pragmatic Consultant, AVP
Job ID:R0434408	Full/Part-Time: Full-time
Regular/Temporary: Regular	Listed: 2026-06-17
Location: Bangalore
Position Overview
Job Title: Data Scientist
/ Data Engineer – “Pragmatic Consultant, AVP
Location: Bangalore, India

Role Description

We are looking for a Data Scientist / Data Engineer who combines strong analytical depth with a consulting mindset: you listen first, clarify the business problem, and then deliver the easiest workable solution not the most technical one.
You will partner with stakeholders to define data requirements, build reliable datasets and pipelines, develop models and statistical analyses where appropriate, and turn outcomes into clear, decision-ready insights through modern BI/visualization tools.
You are an expert in SQL and Python (Pandas) and highly capable with Snowflake, BigQuery, dbt, Qlik, and other data focused frameworks and visualization platforms. You care about data quality, repeatability, and transparency, and you communicate trade-offs balancing speed, risk, and long-term maintainability.
The role aligns closely with “analytics engineering” practices bridging data engineering and analytics with strong communication and documentation.
What we’ll offer you

As part of our flexible scheme, here are just some of the benefits that you’ll enjoy

Best in class leave policy
Gender neutral parental leaves
100% reimbursement under childcare assistance benefit (gender neutral)
Sponsorship for Industry relevant certifications and education
Employee Assistance Program for you and your family members
Comprehensive Hospitalization Insurance for you and your dependents
Accident and Term life Insurance
Complementary Health screening for 35 yrs. and above
Your key responsibilities

Purpose of the Role
Deliver timely analytics, statistical modeling, and data products that address current and future business needs.
Translate ambiguous questions into measurable hypotheses, reliable data assets, and actionable insights focusing on impact over complexity.
Build and maintain scalable, well-governed datasets and transformations to enable self-service analytics and consistent reporting.
1) Business Problem Framing (Consulting Mindset)
Partner with business and technology stakeholders to clarify objectives, success metrics, constraints, and decision points.
Drive structured discovery: identify the simplest dataset/model/visualization that answers the question with acceptable confidence.
Provide clear recommendations, trade-offs (time/cost/risk), and “next best actions,” not just charts or code.
2) Data Requirements & Data Product Delivery
Define data requirements end-to-end: sources, definitions, lineage, refresh cadence, SLAs, and data quality expectations.
Design and implement robust pipelines (batch/ELT as appropriate) and curated data models using dbt and modern cloud warehouses (e.g., Snowflake, BigQuery).
Apply best practices for performance and maintainability (e.g., warehouse-optimized modeling/partitioning/denormalization where relevant).
3) Data Preparation, Quality, and Reliability
Perform data collection, processing, cleaning, and validation to ensure accuracy, completeness, and consistency.
Implement automated quality checks, documentation, and monitoring so stakeholders can trust the numbers.
4) Analytics, Modeling, and Research
Examine and identify patterns and trends to answer business questions and improve decision-making.
Build statistical reports and analytical methodologies; where data science is the focus:
Create/maintain modeling approaches, data mining architectures, and robust evaluation methodologies.
Research and apply relevant data science principles and emerging techniques to business problems.
At higher levels, contribute to or lead research initiatives to advance analytics capabilities.
5) Visualization, Storytelling, and Enablement
Build intuitive and accurate dashboards and narratives using Qlik and other BI/visualization tools (e.g., Power BI, Tableau, Looker).
Present insights in business language highlighting drivers, uncertainty, and implications.
Enable self-service: publish reusable datasets, metrics, and “single source of truth” definitions. (Example of Python-driven data processing with visualization in Qlik is a known pattern.)
6) Efficiency & Automation
Identify and implement opportunities to increase efficiency via automation (repeatable pipelines, templated analyses, reusable notebooks, shared semantic layers).
Prefer pragmatic solutions (e.g., a well-modeled table + simple dashboard) over complex systems unless complexity is clearly justified.
Your skills and experience

Core Technical
Expert SQL: writing optimized queries, dimensional modeling concepts, debugging data issues, performance tuning.
Expert Python + Pandas: data wrangling, reproducible analysis, packaging reusable components.
Strong hands-on experience with:
Snowflake and/or BigQuery (warehouse concepts, performance/cost awareness, ELT patterns).
dbt (modeling, tests, documentation, version control workflows).
Qlik and other BI/visualization tools (dashboard design, user adoption, semantic consistency).
Analytics / Data Science
Solid grounding in statistics and experimental thinking (hypothesis testing, bias/variance intuition, model evaluation).
Ability to choose the simplest appropriate approach and explain why.
Professional / Consulting Behaviors
Strong stakeholder management: clarify “what decision are we supporting?” and drive alignment on definitions.
Crisp communication: translate data into implications, options, and recommendations.
Ownership and pragmatism: deliver incremental value early; iterate with feedback.
Nice to Have
Experience with data orchestration tools (e.g., Airflow, Prefect) and CI/CD for data.
Familiarity with analytics engineering practices documentation, testing, metric governance, and semantic layers.
Experience representing the organization in industry initiatives or communities as a data practitioner.
What Success Looks Like (First 3–6 Months)
Stakeholders consistently use your outputs to make decisions (clear metrics, trusted dashboards, reliable datasets).
The assets you develop are stable, tested, documented, and easy for others to extend.
You reduce cycle time for answering business questions by standardizing datasets and automating repeatable analyses.
You are known for solving problems with the simplest effective approach, while keeping quality and governance high.
How we’ll support you

Training and development to help you excel in your career
Coaching and support from experts in your team
A culture of continuous learning to aid progression
A range of flexible benefits that you can tailor to suit your needs
About us and our teams

Please visit our company website for further information:

https://www.db.com/company/company.html`;

async function testDecode() {
  console.log("Sending decode request to live edge function...");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({ jdText })
    });

    console.log("Response Status:", response.status);
    const data = await response.json();
    
    console.log("\n--- DECODED RESULT OVERVIEW ---");
    console.log("Role:", data.overview.role);
    console.log("Company:", data.overview.company);
    console.log("Location:", data.overview.location);
    console.log("Work Mode:", data.overview.work_mode);
    console.log("Seniority:", data.overview.seniority);
    console.log("Experience Required:", data.experience_required || data.overview.experience_required);
    console.log("Is Experience Estimated?:", data.overview.experience_is_estimated);
    console.log("Package / Salary:", data.overview.package);
    console.log("Education Threshold (Hard Requirements):", data.structured_data.hard_requirements.filter(hr => hr.category?.toLowerCase().includes("edu")));
    console.log("Requirements Education:", data.requirements.education);
    
    console.log("\n--- DAY IN LIFE ---");
    console.log(JSON.stringify(data.deep_dive?.day_in_life, null, 2));
    
    console.log("\n--- INTERVIEW QUESTIONS ---");
    console.log(JSON.stringify(data.interview_kit?.questions?.map((q, i) => `${i+1}. [${q.type}] ${q.question}`), null, 2));
    
    console.log("\n--- REVERSE QUESTIONS ---");
    console.log(JSON.stringify(data.interview_kit?.reverse_questions, null, 2));

    console.log("\n--- STRUCTURED DATA ATS KEYWORDS ---");
    console.log(JSON.stringify(data.structured_data?.keywords_for_ats, null, 2));

    console.log("\n--- RESUME HELP ---");
    console.log(JSON.stringify(data.resume_help, null, 2));

    console.log("\nFull Overview Object:", JSON.stringify(data.overview, null, 2));
    console.log("\nFull Logistics Object:", JSON.stringify(data.logistics, null, 2));
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testDecode();
