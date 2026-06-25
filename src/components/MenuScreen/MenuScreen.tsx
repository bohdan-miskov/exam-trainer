import React, { useState } from "react";
import type { Question } from "../../utils/parser";
import styles from "./MenuScreen.module.css";

interface MenuScreenProps {
  wrongCount: number;
  bookmarkedCount: number;
  allQuestions: Question[];
  onStartRandom: () => void;
  onStartExam: () => void;
  onStartWrong: () => void;
  onStartBookmark: () => void;
  onStartTopic: (topicName: string, keywords: string[]) => void;
  onViewStats: () => void;
  menuError: string | null;
}

export const AWS_TOPICS = [
  { id: "s3", name: "S3 Storage", keywords: ["s3", "simple storage service"] },
  { id: "ec2", name: "EC2 Compute", keywords: ["ec2", "elastic compute cloud", "ami"] },
  { id: "iam", name: "IAM Security", keywords: ["iam", "identity and access", "least privilege", "policy", "role"] },
  { id: "vpc", name: "VPC Networking", keywords: ["vpc", "virtual private cloud", "subnet", "security group", "nacl", "internet gateway"] },
  { id: "rds", name: "RDS & Databases", keywords: ["rds", "relational database", "dynamodb", "aurora", "redshift", "elasticache"] },
  { id: "lambda", name: "Serverless & Lambda", keywords: ["lambda", "serverless", "fargate", "api gateway"] },
  { id: "monitoring", name: "Monitoring & Auditing", keywords: ["cloudwatch", "cloudtrail", "inspector", "trusted advisor"] },
  { id: "billing", name: "Billing & Pricing", keywords: ["billing", "cost", "pricing", "budget", "cost explorer", "reserved instance", "spot instance"] },
  { id: "security", name: "Security & Shield", keywords: ["security", "shared responsibility", "waf", "shield", "kms", "artifact", "guardduty"] },
];

export default function MenuScreen({
  wrongCount,
  bookmarkedCount,
  allQuestions,
  onStartRandom,
  onStartExam,
  onStartWrong,
  onStartBookmark,
  onStartTopic,
  onViewStats,
  menuError,
}: MenuScreenProps) {
  const [view, setView] = useState<"main" | "topics">("main");

  // Динамічний підрахунок кількості питань по темі
  const getTopicCount = (keywords: string[]) => {
    return allQuestions.filter((q) => {
      const textToSearch = (q.text + " " + q.options.map((o) => o.text).join(" ")).toLowerCase();
      return keywords.some((kw) => textToSearch.includes(kw));
    }).length;
  };

  if (view === "topics") {
    return (
      <div className={styles.menuContainer}>
        <div className={styles.menuHeader}>
          <h1 className={styles.titleGradient}>Topic Focus Quiz</h1>
          <p className={styles.menuSubtitle}>Practice specific AWS Services and Areas</p>
        </div>

        <div className={styles.topicsGrid}>
          {AWS_TOPICS.map((topic) => {
            const count = getTopicCount(topic.keywords);
            return (
              <div 
                key={topic.id} 
                onClick={() => onStartTopic(topic.name, topic.keywords)}
                className={styles.topicCard}
              >
                <div className={styles.topicName}>{topic.name}</div>
                <div className={styles.topicCount}>{count} Questions</div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={() => setView("main")} 
          className={`${styles.btn} ${styles.btnSecondary} ${styles.wFull}`}
          style={{ marginTop: "16px" }}
        >
          Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className={styles.menuContainer}>
      <div className={styles.menuHeader}>
        <h1 className={styles.titleGradient}>AWS Practice Quiz</h1>
        <p className={styles.menuSubtitle}>Prepare for your AWS Certification Exams</p>
      </div>

      {menuError && (
        <div className={`${styles.feedbackPanel} ${styles.incorrect}`}>
          <div className={styles.feedbackTitle}>{menuError}</div>
        </div>
      )}

      <button onClick={onStartRandom} className={styles.btn}>
        Take a Random Quiz (20 Qs)
      </button>
      <button onClick={() => setView("topics")} className={styles.btn}>
        Topic Focus Mode
      </button>
      <button onClick={onStartExam} className={styles.btn}>
        Start Exam Simulator (65 Qs - 90 mins)
      </button>
      <button onClick={onStartBookmark} className={`${styles.btn} ${styles.btnSecondary}`}>
        Review Bookmarked Questions ({bookmarkedCount})
      </button>
      <button onClick={onStartWrong} className={`${styles.btn} ${styles.btnSecondary}`}>
        Review Incorrect Answers ({wrongCount})
      </button>
      <button onClick={onViewStats} className={`${styles.btn} ${styles.btnSecondary}`}>
        View Performance Stats
      </button>
    </div>
  );
}
