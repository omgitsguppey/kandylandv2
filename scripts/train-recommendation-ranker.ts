import fs from "node:fs";
import path from "node:path";

import admin from "firebase-admin";

import { generateRecommendationCandidates } from "@/lib/recommendations/candidate-generation";
import type { RecommendationModelArtifact } from "@/lib/recommendations/ml-ranker";
import { buildRecommendationRankingFeatures, type RecommendationBehavioralProfileLike, type RecommendationDropIntelligenceLike } from "@/lib/recommendations/ranking-features";
import type { Drop } from "@/types/db";

type TrainingSample = {
  features: Record<string, number>;
  labels: {
    predictedPaidConversion: 0 | 1;
    predictedUnlock: 0 | 1;
    predictedWatchCompletion: 0 | 1;
    predictedReturn: 0 | 1;
  };
};

type LogisticModel = {
  intercept: number;
  weights: Record<string, number>;
};

const ARTIFACT_PATH = path.resolve(process.cwd(), "agent/state/recommendation-model.generated.json");
const FEATURE_NAMES = [
  "creatorAffinity",
  "contentAffinity",
  "experienceAffinity",
  "completionQuality",
  "unlockQuality",
  "purchaseIntent",
  "returnCadence",
  "popularity",
  "freshness",
  "urgency",
  "priceFit",
  "followedCreatorBoost",
  "previousUnlockCreatorBoost",
  "similarUserBoost",
  "confidence",
  "previousExposurePenalty",
  "fatiguePenalty",
] as const;

function getTrainingAdminDb() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
    }
  }

  return admin.firestore();
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function toFeatureMap(features: ReturnType<typeof buildRecommendationRankingFeatures>) {
  return {
    creatorAffinity: features.creatorAffinity,
    contentAffinity: features.contentAffinity,
    experienceAffinity: features.experienceAffinity,
    completionQuality: features.completionQuality,
    unlockQuality: features.unlockQuality,
    purchaseIntent: features.purchaseIntent,
    returnCadence: features.returnCadence,
    popularity: features.popularity,
    freshness: features.freshness,
    urgency: features.urgency,
    priceFit: features.priceFit,
    followedCreatorBoost: features.followedCreatorBoost,
    previousUnlockCreatorBoost: features.previousUnlockCreatorBoost,
    similarUserBoost: features.similarUserBoost,
    confidence: features.confidence,
    previousExposurePenalty: features.previousExposurePenalty / 40,
    fatiguePenalty: features.fatiguePenalty / 16,
  };
}

function predict(model: LogisticModel, sample: Record<string, number>) {
  let weighted = model.intercept;
  FEATURE_NAMES.forEach((name) => {
    weighted += (sample[name] || 0) * (model.weights[name] || 0);
  });
  return sigmoid(weighted);
}

function trainLogisticModel(samples: TrainingSample[], labelKey: keyof TrainingSample["labels"]) {
  const model: LogisticModel = {
    intercept: 0,
    weights: Object.fromEntries(FEATURE_NAMES.map((name) => [name, 0])),
  };
  const trainSet = samples.filter((sample, index) => index % 5 !== 0);
  const testSet = samples.filter((sample, index) => index % 5 === 0);
  const learningRate = 0.35;

  for (let epoch = 0; epoch < 240; epoch += 1) {
    trainSet.forEach((sample) => {
      const prediction = predict(model, sample.features);
      const label = sample.labels[labelKey];
      const error = label - prediction;

      model.intercept += learningRate * error;
      FEATURE_NAMES.forEach((name) => {
        model.weights[name] += learningRate * error * (sample.features[name] || 0);
      });
    });
  }

  const evaluationSet = testSet.length > 0 ? testSet : trainSet;
  const accuracy = evaluationSet.length === 0
    ? 0
    : evaluationSet.filter((sample) => {
      const prediction = predict(model, sample.features);
      return (prediction >= 0.5 ? 1 : 0) === sample.labels[labelKey];
    }).length / evaluationSet.length;

  return {
    model,
    accuracy: clamp01(accuracy),
    holdoutSampleCount: evaluationSet.length,
    positiveRate: evaluationSet.length === 0
      ? 0
      : evaluationSet.reduce((sum, sample) => sum + sample.labels[labelKey], 0) / evaluationSet.length,
  };
}

function buildBootstrapSamples(): TrainingSample[] {
  return [
    {
      features: {
        creatorAffinity: 0.82, contentAffinity: 0.74, experienceAffinity: 0.62, completionQuality: 0.78,
        unlockQuality: 0.64, purchaseIntent: 0.71, returnCadence: 0.66, popularity: 0.58,
        freshness: 0.72, urgency: 0.22, priceFit: 0.79, followedCreatorBoost: 1, previousUnlockCreatorBoost: 1,
        similarUserBoost: 0, confidence: 0.84, previousExposurePenalty: 0.02, fatiguePenalty: 0.03,
      },
      labels: { predictedPaidConversion: 1, predictedUnlock: 1, predictedWatchCompletion: 1, predictedReturn: 1 },
    },
    {
      features: {
        creatorAffinity: 0.18, contentAffinity: 0.22, experienceAffinity: 0.2, completionQuality: 0.3,
        unlockQuality: 0.15, purchaseIntent: 0.12, returnCadence: 0.08, popularity: 0.44,
        freshness: 0.65, urgency: 0.1, priceFit: 0.6, followedCreatorBoost: 0, previousUnlockCreatorBoost: 0,
        similarUserBoost: 0, confidence: 0.28, previousExposurePenalty: 0.35, fatiguePenalty: 0.3,
      },
      labels: { predictedPaidConversion: 0, predictedUnlock: 0, predictedWatchCompletion: 0, predictedReturn: 0 },
    },
    {
      features: {
        creatorAffinity: 0.41, contentAffinity: 0.62, experienceAffinity: 0.55, completionQuality: 0.68,
        unlockQuality: 0.36, purchaseIntent: 0.22, returnCadence: 0.61, popularity: 0.53,
        freshness: 0.75, urgency: 0.32, priceFit: 0.77, followedCreatorBoost: 0, previousUnlockCreatorBoost: 0,
        similarUserBoost: 1, confidence: 0.67, previousExposurePenalty: 0.08, fatiguePenalty: 0.09,
      },
      labels: { predictedPaidConversion: 0, predictedUnlock: 1, predictedWatchCompletion: 1, predictedReturn: 1 },
    },
    {
      features: {
        creatorAffinity: 0.62, contentAffinity: 0.43, experienceAffinity: 0.3, completionQuality: 0.51,
        unlockQuality: 0.49, purchaseIntent: 0.63, returnCadence: 0.34, popularity: 0.37,
        freshness: 0.48, urgency: 0.14, priceFit: 0.55, followedCreatorBoost: 1, previousUnlockCreatorBoost: 0,
        similarUserBoost: 0, confidence: 0.73, previousExposurePenalty: 0.05, fatiguePenalty: 0.06,
      },
      labels: { predictedPaidConversion: 1, predictedUnlock: 1, predictedWatchCompletion: 0, predictedReturn: 0 },
    },
    {
      features: {
        creatorAffinity: 0.12, contentAffinity: 0.54, experienceAffinity: 0.5, completionQuality: 0.73,
        unlockQuality: 0.2, purchaseIntent: 0.08, returnCadence: 0.25, popularity: 0.65,
        freshness: 0.88, urgency: 0.46, priceFit: 0.83, followedCreatorBoost: 0, previousUnlockCreatorBoost: 0,
        similarUserBoost: 0, confidence: 0.52, previousExposurePenalty: 0.04, fatiguePenalty: 0.04,
      },
      labels: { predictedPaidConversion: 0, predictedUnlock: 0, predictedWatchCompletion: 1, predictedReturn: 0 },
    },
  ];
}

async function loadFirestoreTrainingSamples() {
  try {
    const db = getTrainingAdminDb();
    const [profilesSnap, intelligenceSnap, dropsSnap] = await Promise.all([
      db.collection("behavioral_user_profiles").limit(180).get(),
      db.collection("behavioral_drop_intelligence").limit(500).get(),
      db.collection("drops").where("status", "==", "active").limit(300).get(),
    ]);
    const drops = dropsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })) as Drop[];

    if (profilesSnap.empty || drops.length === 0) {
      return {
        samples: [] as TrainingSample[],
        trainingSource: "synthetic_bootstrap" as const,
      };
    }

    const intelligenceMap = new Map<string, RecommendationDropIntelligenceLike>(
      intelligenceSnap.docs.map((doc) => [doc.id, { ...(doc.data() as RecommendationDropIntelligenceLike), dropId: doc.id }]),
    );

    const samples: TrainingSample[] = [];
    profilesSnap.docs.forEach((doc) => {
      const profile = doc.data() as RecommendationBehavioralProfileLike;
      const candidates = generateRecommendationCandidates({
        drops,
        profile,
        dropIntelligence: intelligenceMap,
        limit: 12,
      });
      if (candidates.length === 0) {
        return;
      }

      const strongPositiveDropIds = new Set([
        ...(profile.positiveDropIds || []).slice(0, 4),
        ...(profile.recentDropIds || []).slice(0, 3),
      ]);

      const userHasPurchases = (profile.purchaseCount || 0) > 0;
      const watchReady = (profile.watchSessionCount || 0) > 0;
      const activeReturner = (profile.sessionFrequency30d || 0) >= 2;

      candidates.slice(0, 8).forEach((candidate, index) => {
        const features = buildRecommendationRankingFeatures({
          drop: candidate.drop,
          profile,
          intelligence: intelligenceMap.get(candidate.drop.id),
          candidate,
          surface: "drops",
        });
        const contentStrong = features.contentAffinity >= 0.45;
        const creatorStrong = features.creatorAffinity >= 0.45;
        const positive = strongPositiveDropIds.has(candidate.drop.id)
          || (index < 2 && (contentStrong || creatorStrong));
        const purchaseReady = userHasPurchases && features.purchaseIntent >= 0.28 && features.priceFit >= 0.45;
        const completedWatch = watchReady && features.predictedWatchCompletion >= 0.45;

        samples.push({
          features: toFeatureMap(features),
          labels: {
            predictedPaidConversion: positive && purchaseReady ? 1 : 0,
            predictedUnlock: positive && features.predictedUnlock >= 0.35 ? 1 : 0,
            predictedWatchCompletion: positive && completedWatch ? 1 : 0,
            predictedReturn: positive && activeReturner && features.predictedReturn >= 0.35 ? 1 : 0,
          },
        });
      });
    });

    return {
      samples,
      trainingSource: samples.length >= 20 ? "firestore_proxy" as const : "synthetic_bootstrap" as const,
    };
  } catch {
    return {
      samples: [] as TrainingSample[],
      trainingSource: "synthetic_bootstrap" as const,
    };
  }
}

async function main() {
  const firestoreSource = await loadFirestoreTrainingSamples();
  const bootstrapSamples = buildBootstrapSamples();
  const samples = firestoreSource.trainingSource === "firestore_proxy" && firestoreSource.samples.length >= 20
    ? firestoreSource.samples
    : [...firestoreSource.samples, ...bootstrapSamples];
  const trainingSource = firestoreSource.trainingSource === "firestore_proxy" && firestoreSource.samples.length >= 20
    ? "firestore_proxy"
    : "synthetic_bootstrap";

  const paid = trainLogisticModel(samples, "predictedPaidConversion");
  const unlock = trainLogisticModel(samples, "predictedUnlock");
  const watch = trainLogisticModel(samples, "predictedWatchCompletion");
  const returned = trainLogisticModel(samples, "predictedReturn");
  const meanAccuracy = clamp01((paid.accuracy + unlock.accuracy + watch.accuracy + returned.accuracy) / 4);
  const meanPositiveRate = clamp01((paid.positiveRate + unlock.positiveRate + watch.positiveRate + returned.positiveRate) / 4);

  const artifact: RecommendationModelArtifact = {
    version: 1,
    generatedAt: new Date().toISOString(),
    staleAfterMs: 7 * 24 * 60 * 60 * 1000,
    trainingSource,
    sampleCount: samples.length,
    holdoutSampleCount: Math.max(paid.holdoutSampleCount, unlock.holdoutSampleCount, watch.holdoutSampleCount, returned.holdoutSampleCount),
    featureNames: [...FEATURE_NAMES],
    blendWeight: trainingSource === "firestore_proxy"
      ? clamp01(0.2 + (meanAccuracy * 0.35))
      : 0.18,
    evaluation: {
      meanAccuracy,
      meanPositiveRate,
    },
    heads: {
      predictedPaidConversion: {
        intercept: paid.model.intercept,
        weights: paid.model.weights,
        trainingAccuracy: paid.accuracy,
      },
      predictedUnlock: {
        intercept: unlock.model.intercept,
        weights: unlock.model.weights,
        trainingAccuracy: unlock.accuracy,
      },
      predictedWatchCompletion: {
        intercept: watch.model.intercept,
        weights: watch.model.weights,
        trainingAccuracy: watch.accuracy,
      },
      predictedReturn: {
        intercept: returned.model.intercept,
        weights: returned.model.weights,
        trainingAccuracy: returned.accuracy,
      },
    },
  };

  fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
  fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  console.log(`[recommendations] wrote model artifact to ${ARTIFACT_PATH}`);
  console.log(`[recommendations] source=${trainingSource} samples=${samples.length} meanAccuracy=${Math.round(meanAccuracy * 100)}%`);
}

void main().catch((error) => {
  console.error("[recommendations] training failed", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
