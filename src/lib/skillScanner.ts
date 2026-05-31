/**
 * skillScanner.ts
 * ===============
 * Handles instant local scanning and classification of technical skills
 * from candidate experience, education, and master summary.
 */

import type { VaultItem } from "@/types/jd";

// Comprehensive Technical Skills Dictionary
export const TECHNICAL_DICTIONARY: Record<string, string[]> = {
  "Programming Languages": [
    "python", "javascript", "typescript", "java", "c\\+\\+", "c\\#", "go", "golang", "rust",
    "ruby", "php", "swift", "kotlin", "scala", "clojure", "haskell", "erlang", "elixir",
    "bash", "shell", "powershell", "perl", "dart", "assembly", "julia", "r", "sql", "html", "css"
  ],
  "Infrastructure / DevOps": [
    "aws", "amazon web services", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s",
    "terraform", "ansible", "puppet", "chef", "jenkins", "circleci", "github actions", "gitlab ci",
    "nginx", "apache", "docker-compose", "helm", "prometheus", "grafana", "elk stack", "splunk",
    "linux", "unix", "ubuntu", "centos", "redhat", "cloudformation", "packer", "vagrant", "serverless",
    "lambda", "ecs", "eks", "route53", "rds", "s3", "iam", "vpc", "cloudfront", "heroku", "netlify",
    "vercel", "digitalocean", "cloudflare", "openshift", "argo cd", "argocd", "consul", "vault"
  ],
  "AI / ML": [
    "pytorch", "tensorflow", "keras", "hugging face", "huggingface", "llm", "llms", "large language models",
    "nlp", "natural language processing", "deep learning", "machine learning", "neural networks",
    "computer vision", "opencv", "langchain", "llamaindex", "openai", "gpt-4", "gpt-3.5", "claude",
    "gemini", "llama", "mistral", "vector database", "vector databases", "pinecone", "chromadb", "weaviate",
    "milvus", "qdrant", "rag", "retrieval-augmented generation", "fine-tuning", "finetuning", "lora",
    "qlora", "diffusion", "stable diffusion", "midjourney", "gan", "gans", "reinforcement learning",
    "scikit-learn", "scikit", "sklearn", "xgboost", "lightgbm", "catboost", "spacy", "nltk", "transformers",
    "bert", "resnet", "cnn", "rnn", "lstm", "mlops", "mlflow", "dvc", "wandb", "weights & biases", "sagemaker"
  ],
  "Data Science": [
    "pandas", "numpy", "scipy", "matplotlib", "seaborn", "plotly", "tableau", "power bi", "powerbi",
    "apache spark", "spark", "pyspark", "hadoop", "hive", "pig", "mapreduce", "kafka", "flink",
    "airflow", "presto", "trino", "snowflake", "databricks", "dbt", "bigquery", "redshift",
    "statistics", "regression", "classification", "clustering", "hypothesis testing", "ab testing",
    "a/b testing", "data mining", "data analytics", "data pipelines", "etl", "elt", "data warehousing",
    "postgresql", "mysql", "sqlite", "mongodb", "redis", "cassandra", "neo4j", "graphql"
  ],
  "Software Engineering / Others": [
    "react", "react.js", "next.js", "nextjs", "vue", "angular", "node.js", "nodejs", "express", "django",
    "flask", "fastapi", "spring boot", "spring", "asp.net", "laravel", "git", "github", "gitlab", "bitbucket",
    "jira", "confluence", "trello", "scrum", "agile", "kanban", "ci/cd", "rest api", "restful api",
    "grpc", "websockets", "microservices", "soa", "oop", "functional programming", "unit testing",
    "integration testing", "jest", "cypress", "mocha", "chai", "playwright", "eslint", "prettier", "vite",
    "webpack", "npm", "yarn", "pnpm", "bun", "supabase", "firebase", "prisma", "sequelize", "mongoose"
  ]
};

// Map lowercase matches back to standard capitalized names for premium display
export const SKILL_CAPITALIZATION_MAP: Record<string, string> = {
  "python": "Python", "javascript": "JavaScript", "typescript": "TypeScript", "java": "Java",
  "c\\+\\+": "C++", "c\\#": "C#", "go": "Go", "golang": "Go", "rust": "Rust", "ruby": "Ruby",
  "php": "PHP", "swift": "Swift", "kotlin": "Kotlin", "scala": "Scala", "clojure": "Clojure",
  "haskell": "Haskell", "erlang": "Erlang", "elixir": "Elixir", "bash": "Bash", "shell": "Shell",
  "powershell": "PowerShell", "perl": "Perl", "dart": "Dart", "assembly": "Assembly", "julia": "Julia",
  "r": "R", "sql": "SQL", "html": "HTML", "css": "CSS",

  "aws": "AWS", "amazon web services": "AWS", "azure": "Azure", "gcp": "GCP", "google cloud": "Google Cloud",
  "docker": "Docker", "kubernetes": "Kubernetes", "k8s": "Kubernetes (K8s)", "terraform": "Terraform",
  "ansible": "Ansible", "puppet": "Puppet", "chef": "Chef", "jenkins": "Jenkins", "circleci": "CircleCI",
  "github actions": "GitHub Actions", "gitlab ci": "GitLab CI", "nginx": "Nginx", "apache": "Apache",
  "docker-compose": "Docker Compose", "helm": "Helm", "prometheus": "Prometheus", "grafana": "Grafana",
  "elk stack": "ELK Stack", "splunk": "Splunk", "linux": "Linux", "unix": "Unix", "ubuntu": "Ubuntu",
  "centos": "CentOS", "redhat": "Red Hat", "cloudformation": "CloudFormation", "packer": "Packer",
  "vagrant": "Vagrant", "serverless": "Serverless", "lambda": "AWS Lambda", "ecs": "AWS ECS",
  "eks": "AWS EKS", "route53": "Route53", "rds": "AWS RDS", "s3": "AWS S3", "iam": "AWS IAM",
  "vpc": "AWS VPC", "cloudfront": "CloudFront", "heroku": "Heroku", "netlify": "Netlify",
  "vercel": "Vercel", "digitalocean": "DigitalOcean", "cloudflare": "Cloudflare", "openshift": "OpenShift",
  "argo cd": "Argo CD", "argocd": "Argo CD", "consul": "Consul", "vault": "HashiCorp Vault",

  "pytorch": "PyTorch", "tensorflow": "TensorFlow", "keras": "Keras", "hugging face": "Hugging Face",
  "huggingface": "Hugging Face", "llm": "LLMs", "llms": "LLMs", "large language models": "LLMs",
  "nlp": "Natural Language Processing (NLP)", "natural language processing": "Natural Language Processing (NLP)",
  "deep learning": "Deep Learning", "machine learning": "Machine Learning", "neural networks": "Neural Networks",
  "computer vision": "Computer Vision", "opencv": "OpenCV", "langchain": "LangChain", "llamaindex": "LlamaIndex",
  "openai": "OpenAI", "gpt-4": "GPT-4", "gpt-3.5": "GPT-3.5", "claude": "Claude AI", "gemini": "Gemini AI",
  "llama": "LLaMA", "mistral": "Mistral AI", "vector database": "Vector Databases", "vector databases": "Vector Databases",
  "pinecone": "Pinecone", "chromadb": "ChromaDB", "weaviate": "Weaviate", "milvus": "Milvus", "qdrant": "Qdrant",
  "rag": "RAG (Retrieval-Augmented Gen)", "retrieval-augmented generation": "RAG", "fine-tuning": "LLM Fine-tuning",
  "finetuning": "LLM Fine-tuning", "lora": "LoRA", "qlora": "QLoRA", "diffusion": "Diffusion Models",
  "stable diffusion": "Stable Diffusion", "midjourney": "Midjourney", "gan": "GANs", "gans": "GANs",
  "reinforcement learning": "Reinforcement Learning", "scikit-learn": "Scikit-Learn", "scikit": "Scikit-Learn",
  "sklearn": "Scikit-Learn", "xgboost": "XGBoost", "lightgbm": "LightGBM", "catboost": "CatBoost",
  "spacy": "spaCy", "nltk": "NLTK", "transformers": "Transformers", "bert": "BERT", "resnet": "ResNet",
  "cnn": "CNNs", "rnn": "RNNs", "lstm": "LSTMs", "mlops": "MLOps", "mlflow": "MLflow", "dvc": "DVC",
  "wandb": "Weights & Biases", "weights & biases": "Weights & Biases", "sagemaker": "AWS SageMaker",

  "pandas": "Pandas", "numpy": "NumPy", "scipy": "SciPy", "matplotlib": "Matplotlib", "seaborn": "Seaborn",
  "plotly": "Plotly", "tableau": "Tableau", "power bi": "Power BI", "powerbi": "Power BI",
  "apache spark": "Apache Spark", "spark": "Apache Spark", "pyspark": "PySpark", "hadoop": "Hadoop",
  "hive": "Apache Hive", "pig": "Apache Pig", "mapreduce": "MapReduce", "kafka": "Apache Kafka",
  "flink": "Apache Flink", "airflow": "Apache Airflow", "presto": "Presto", "trino": "Trino",
  "snowflake": "Snowflake", "databricks": "Databricks", "dbt": "dbt", "bigquery": "Google BigQuery",
  "redshift": "AWS Redshift", "statistics": "Statistics", "regression": "Regression Analysis",
  "classification": "Classification Models", "clustering": "Clustering Models", "hypothesis testing": "Hypothesis Testing",
  "ab testing": "A/B Testing", "a/b testing": "A/B Testing", "data mining": "Data Mining", "data analytics": "Data Analytics",
  "data pipelines": "Data Pipelines", "etl": "ETL", "elt": "ELT", "data warehousing": "Data Warehousing",
  "postgresql": "PostgreSQL", "mysql": "MySQL", "sqlite": "SQLite", "mongodb": "MongoDB", "redis": "Redis",
  "cassandra": "Cassandra", "neo4j": "Neo4j", "graphql": "GraphQL",

  "react": "React", "react.js": "React", "next.js": "Next.js", "nextjs": "Next.js", "vue": "Vue.js",
  "angular": "Angular", "node.js": "Node.js", "nodejs": "Node.js", "express": "Express.js", "django": "Django",
  "flask": "Flask", "fastapi": "FastAPI", "spring boot": "Spring Boot", "spring": "Spring Framework",
  "asp.net": "ASP.NET", "laravel": "Laravel", "git": "Git", "github": "GitHub", "gitlab": "GitLab",
  "bitbucket": "BitBucket", "jira": "Jira", "confluence": "Confluence", "trello": "Trello", "scrum": "Scrum",
  "agile": "Agile Methodology", "kanban": "Kanban", "ci/cd": "CI/CD", "rest api": "RESTful APIs",
  "restful api": "RESTful APIs", "grpc": "gRPC", "websockets": "WebSockets", "microservices": "Microservices",
  "soa": "SOA", "oop": "OOP", "functional programming": "Functional Programming", "unit testing": "Unit Testing",
  "integration testing": "Integration Testing", "jest": "Jest", "cypress": "Cypress", "mocha": "Mocha",
  "chai": "Chai", "playwright": "Playwright", "eslint": "ESLint", "prettier": "Prettier", "vite": "Vite",
  "webpack": "Webpack", "npm": "npm", "yarn": "Yarn", "pnpm": "pnpm", "bun": "Bun", "supabase": "Supabase",
  "firebase": "Firebase", "prisma": "Prisma ORM", "sequelize": "Sequelize", "mongoose": "Mongoose"
};

/**
 * Scans VaultItems and the Master Summary using word boundary matching regex
 * to identify technical skills and classify them into their correct categories.
 */
export function scanProfileForSkills(items: VaultItem[], summary?: string): Record<string, string[]> {
  const result: Record<string, Set<string>> = {
    "Programming Languages": new Set<string>(),
    "Infrastructure / DevOps": new Set<string>(),
    "AI / ML": new Set<string>(),
    "Data Science": new Set<string>(),
    "Software Engineering / Others": new Set<string>()
  };

  // Compile all text from profile elements
  let rawText = (summary || "") + " ";
  items.forEach(item => {
    rawText += `${item.title} ${item.organization} ${item.description} ${item.skills.join(" ")} ${(item.bullets || []).join(" ")} `;
  });

  // Clean rawText for easier regex matches
  const normalizedText = rawText.toLowerCase();

  // Scan for each skill in our technical dictionary
  Object.entries(TECHNICAL_DICTIONARY).forEach(([category, skills]) => {
    skills.forEach(skillKey => {
      // Escape for regex and check word boundaries
      // Note: for terms with special chars like c++ or c#, we handle separately
      let regexStr = `\\b${skillKey}\\b`;
      if (skillKey.includes("+") || skillKey.includes("#")) {
        regexStr = `\\b${skillKey.replace(/\+/g, "\\+").replace(/#/g, "\\#")}(?=\\s|\\b|$)`;
      }
      
      const regex = new RegExp(regexStr, "i");
      if (regex.test(normalizedText)) {
        // Map back to beautiful capitalizing
        const standardName = SKILL_CAPITALIZATION_MAP[skillKey] || skillKey;
        result[category].add(standardName);
      }
    });
  });

  // Convert Sets to Arrays and sort alphabetically
  const finalResult: Record<string, string[]> = {};
  Object.entries(result).forEach(([category, set]) => {
    finalResult[category] = Array.from(set).sort();
  });

  return finalResult;
}

/**
 * Generates the prompt to seed the LLM skills extraction.
 */
export function generateLLMSeedPrompt(items: VaultItem[], summary?: string): string {
  const experiences = items.filter(i => i.type === 'professional').map(i => `${i.title} at ${i.organization}: ${i.description}. Bullets: ${(i.bullets || []).join("; ")}`).join("\n");
  const education = items.filter(i => i.type === 'education').map(i => `${i.title} from ${i.organization}: ${i.description}`).join("\n");
  const projects = items.filter(i => i.type === 'project').map(i => `${i.title} (${i.organization}): ${i.description}`).join("\n");

  return `You are an elite developer recruitment crawler. Extract ALL technical skills, technologies, tools, and libraries mentioned in this candidate's master profile, experiences, and academic pedigree.
Classify each skill EXACTLY into one of these 5 categories:
1. "Programming Languages" (e.g. Python, C++, TypeScript)
2. "Infrastructure / DevOps" (e.g. AWS, Docker, Terraform)
3. "AI / ML" (e.g. PyTorch, LangChain, LLMs, Scikit-Learn)
4. "Data Science" (e.g. Pandas, NumPy, Spark, SQL, Airflow)
5. "Software Engineering / Others" (e.g. React, Node.js, Git, REST APIs)

Below is the candidate's master context data:

MASTER PROFILE SUMMARY:
${summary || "Not Provided"}

STRATEGIC EXPERIENCE:
${experiences || "None"}

ACADEMIC PEDIGREE:
${education || "None"}

PROJECTS & PRODUCTS:
${projects || "None"}

MANDATE:
- Return ONLY valid JSON format.
- Output absolute, highly-accurate skill lists. Do not invent skills.
- Use standard industry capitalization (e.g., "TypeScript" instead of "typescript", "PyTorch" instead of "pytorch").

EXPECTED JSON SCHEMA:
{
  "Programming Languages": [],
  "Infrastructure / DevOps": [],
  "AI / ML": [],
  "Data Science": [],
  "Software Engineering / Others": []
}`;
}
