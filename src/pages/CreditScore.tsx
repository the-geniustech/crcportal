import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useMyCreditScoreQuery } from '@/hooks/creditScores/useMyCreditScoreQuery';
import {
  ArrowLeft,
  Award,
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle,
  AlertCircle,
  Info,
  Calendar,
  CreditCard,
  Users,
  Clock,
  Lightbulb,
  ChevronRight,
  Shield,
  Star,
} from 'lucide-react';

// Sample credit score data
const sampleCreditData = {
  totalScore: 685,
  maxScore: 850,
  minScore: 300,
  lastUpdated: '2025-12-25',
  scoreChange: 15,
  scoreChangeDirection: 'up' as const,
  
  factors: {
    contribution: {
      score: 165,
      maxScore: 200,
      percentage: 82.5,
      status: 'good' as const,
      details: [
        { name: 'On-time contributions', value: '24 of 24', impact: 'positive' },
        { name: 'Contribution consistency', value: '100%', impact: 'positive' },
        { name: 'Average contribution amount', value: '₦25,000', impact: 'positive' },
      ],
    },
    repayment: {
      score: 255,
      maxScore: 300,
      percentage: 85,
      status: 'excellent' as const,
      details: [
        { name: 'Loans repaid on time', value: '3 of 3', impact: 'positive' },
        { name: 'Current loan status', value: 'No defaults', impact: 'positive' },
        { name: 'Early repayments', value: '1 loan', impact: 'positive' },
      ],
    },
    attendance: {
      score: 120,
      maxScore: 150,
      percentage: 80,
      status: 'good' as const,
      details: [
        { name: 'Meeting attendance', value: '8 of 10', impact: 'positive' },
        { name: 'RSVP response rate', value: '90%', impact: 'positive' },
        { name: 'Missed meetings', value: '2', impact: 'negative' },
      ],
    },
    participation: {
      score: 75,
      maxScore: 100,
      percentage: 75,
      status: 'fair' as const,
      details: [
        { name: 'Group activities', value: '5 participated', impact: 'positive' },
        { name: 'Guarantor requests accepted', value: '2', impact: 'positive' },
        { name: 'Community engagement', value: 'Moderate', impact: 'neutral' },
      ],
    },
    tenure: {
      score: 70,
      maxScore: 100,
      percentage: 70,
      status: 'good' as const,
      details: [
        { name: 'Membership duration', value: '14 months', impact: 'positive' },
        { name: 'Groups joined', value: '2 active', impact: 'positive' },
        { name: 'Account age', value: '14 months', impact: 'positive' },
      ],
    },
  },
  
  history: [
    { date: '2025-12', score: 685 },
    { date: '2025-11', score: 670 },
    { date: '2025-10', score: 665 },
    { date: '2025-09', score: 650 },
    { date: '2025-08', score: 640 },
    { date: '2025-07', score: 620 },
  ],
  
  loanImpact: {
    currentRate: 5.0,
    potentialRate: 4.0,
    maxLoanMultiplier: 3.0,
    potentialMultiplier: 4.0,
  },
};

const getScoreColor = (score: number) => {
  if (score >= 750) return 'text-green-600';
  if (score >= 650) return 'text-emerald-600';
  if (score >= 550) return 'text-amber-600';
  return 'text-red-600';
};

const getScoreBgColor = (score: number) => {
  if (score >= 750) return 'bg-green-500';
  if (score >= 650) return 'bg-emerald-500';
  if (score >= 550) return 'bg-amber-500';
  return 'bg-red-500';
};

const getScoreLabel = (score: number) => {
  if (score >= 750) return 'Excellent';
  if (score >= 650) return 'Good';
  if (score >= 550) return 'Fair';
  return 'Poor';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'excellent': return 'text-green-600 bg-green-50';
    case 'good': return 'text-emerald-600 bg-emerald-50';
    case 'fair': return 'text-amber-600 bg-amber-50';
    default: return 'text-red-600 bg-red-50';
  }
};

function CreditScoreContent() {
  const navigate = useNavigate();
  const [selectedFactor, setSelectedFactor] = useState<string | null>(null);
  const creditScoreQuery = useMyCreditScoreQuery({ historyMonths: 6 });

  const placeholderCreditData = useMemo(
    () => ({
      totalScore: 300,
      maxScore: 850,
      minScore: 300,
      lastUpdated: new Date().toISOString().slice(0, 10),
      scoreChange: 0,
      scoreChangeDirection: 'up' as const,
      factors: {
        contribution: { score: 0, maxScore: 200, percentage: 0, status: 'poor' as const, details: [] },
        repayment: { score: 0, maxScore: 300, percentage: 0, status: 'poor' as const, details: [] },
        attendance: { score: 0, maxScore: 150, percentage: 0, status: 'poor' as const, details: [] },
        participation: { score: 0, maxScore: 100, percentage: 0, status: 'poor' as const, details: [] },
        tenure: { score: 0, maxScore: 100, percentage: 0, status: 'poor' as const, details: [] },
      },
      history: [],
      loanImpact: { currentRate: 6.0, potentialRate: 5.0, maxLoanMultiplier: 2.0, potentialMultiplier: 3.0 },
    }),
    [],
  );

  const data = creditScoreQuery.data ?? placeholderCreditData;

  const scorePercentage = ((data.totalScore - data.minScore) / (data.maxScore - data.minScore)) * 100;

  const improvementTips = useMemo(() => {
    const tips = [];
    
    if (data.factors.contribution.percentage < 90) {
      tips.push({
        icon: CreditCard,
        title: 'Increase Contribution Consistency',
        description: 'Make all monthly contributions on time to boost your score by up to 20 points.',
        impact: '+20 points',
        priority: 'high',
      });
    }
    
    if (data.factors.attendance.percentage < 85) {
      tips.push({
        icon: Calendar,
        title: 'Improve Meeting Attendance',
        description: 'Attend more group meetings. Each meeting attended adds to your score.',
        impact: '+15 points',
        priority: 'medium',
      });
    }
    
    if (data.factors.participation.percentage < 80) {
      tips.push({
        icon: Users,
        title: 'Engage More with Groups',
        description: 'Participate in group activities and accept guarantor requests when possible.',
        impact: '+10 points',
        priority: 'medium',
      });
    }
    
    if (data.factors.tenure.percentage < 80) {
      tips.push({
        icon: Clock,
        title: 'Maintain Long-term Membership',
        description: 'Your score naturally improves with longer membership duration.',
        impact: '+5 points/month',
        priority: 'low',
      });
    }

    return tips;
  }, [data.factors]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Award className="h-8 w-8 text-emerald-600" />
            Credit Score Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Understand your creditworthiness and how to improve it
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Score Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Score Overview */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 mb-2">Your Credit Score</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-6xl font-bold">{data.totalScore}</span>
                      <span className="text-emerald-200">/ {data.maxScore}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        data.totalScore >= 650 ? 'bg-white/20' : 'bg-amber-400/30'
                      }`}>
                        {getScoreLabel(data.totalScore)}
                      </span>
                      {data.scoreChange !== 0 && (
                        <span className="flex items-center gap-1 text-sm">
                          {data.scoreChangeDirection === 'up' ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {data.scoreChange} points this month
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Score Gauge */}
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="12"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke="white"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${scorePercentage * 4.4} 440`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Star className="h-8 w-8 mx-auto mb-1" />
                        <p className="text-sm font-medium">{getScoreLabel(data.totalScore)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Score Breakdown</h3>
                <div className="space-y-4">
                  {Object.entries(data.factors).map(([key, factor]) => (
                    <div key={key}>
                      <button
                        onClick={() => setSelectedFactor(selectedFactor === key ? null : key)}
                        className="w-full"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 capitalize">{key}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(factor.status)}`}>
                              {factor.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {factor.score} / {factor.maxScore}
                            </span>
                            <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${
                              selectedFactor === key ? 'rotate-90' : ''
                            }`} />
                          </div>
                        </div>
                        <Progress value={factor.percentage} className="h-2" />
                      </button>

                      {selectedFactor === key && (
                        <div className="mt-3 p-4 bg-gray-50 rounded-xl space-y-2">
                          {factor.details.map((detail, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{detail.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{detail.value}</span>
                                {detail.impact === 'positive' && (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                                {detail.impact === 'negative' && (
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Score History */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Score History</h3>
              <div className="h-48 flex items-end gap-2">
                {data.history.slice().reverse().map((point, index) => {
                  const height = ((point.score - data.minScore) / (data.maxScore - data.minScore)) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className={`w-full rounded-t-lg transition-all ${getScoreBgColor(point.score)}`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-xs text-gray-500">{point.date.split('-')[1]}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>6 months ago</span>
                <span>Current</span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Loan Impact */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Loan Benefits</h3>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Your Interest Rate</p>
                  <p className="text-2xl font-bold text-purple-700">{data.loanImpact.currentRate}%</p>
                  {data.totalScore < 750 && (
                    <p className="text-xs text-purple-600 mt-1">
                      Reach 750 score for {data.loanImpact.potentialRate}% rate
                    </p>
                  )}
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Loan Multiplier</p>
                  <p className="text-2xl font-bold text-emerald-700">{data.loanImpact.maxLoanMultiplier}x</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {data.loanImpact.maxLoanMultiplier}x your savings as max loan
                  </p>
                </div>
              </div>

              <Button
                onClick={() => navigate('/loans')}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
              >
                Check Loan Eligibility
              </Button>
            </div>

            {/* Improvement Tips */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold text-gray-900">How to Improve</h3>
              </div>

              <div className="space-y-4">
                {improvementTips.map((tip, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        tip.priority === 'high' ? 'bg-red-100' :
                        tip.priority === 'medium' ? 'bg-amber-100' : 'bg-blue-100'
                      }`}>
                        <tip.icon className={`h-4 w-4 ${
                          tip.priority === 'high' ? 'text-red-600' :
                          tip.priority === 'medium' ? 'text-amber-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">{tip.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{tip.description}</p>
                        <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          {tip.impact}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Ranges */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Score Ranges</h3>
              </div>

              <div className="space-y-3">
                {[
                  { range: '750-850', label: 'Excellent', color: 'bg-green-500', benefits: 'Lowest rates, highest limits' },
                  { range: '650-749', label: 'Good', color: 'bg-emerald-500', benefits: 'Competitive rates' },
                  { range: '550-649', label: 'Fair', color: 'bg-amber-500', benefits: 'Standard rates' },
                  { range: '300-549', label: 'Poor', color: 'bg-red-500', benefits: 'Limited options' },
                ].map((range, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${range.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{range.label}</span>
                        <span className="text-xs text-gray-500">{range.range}</span>
                      </div>
                      <p className="text-xs text-gray-500">{range.benefits}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Last Updated */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Info className="h-4 w-4" />
              <span>Last updated: {new Date(data.lastUpdated).toLocaleDateString('en-NG', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CreditScore() {
  return (
    <AuthProvider>
      <CreditScoreContent />
    </AuthProvider>
  );
}
