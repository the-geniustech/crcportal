import React, { useState, useMemo, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { calculateLoanSummary } from "@/lib/loanMath";
import {
  LOAN_FACILITIES,
  type LoanFacilityKey,
  formatInterestLabel,
  getLoanFacility,
  getLoanTermOptions,
  isLoanFacilityAvailable,
} from "@/lib/loanPolicy";
import {
  Calculator,
  TrendingUp,
  Clock,
  Percent,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Info,
  Target,
  Award,
} from 'lucide-react';

interface LoanCalculatorProps {
  memberData?: {
    totalSavings: number;
    contributionMonths: number;
    creditScore: number;
    activeLoans: number;
    repaymentHistory: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

const addMonths = (date: Date, months: number) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
};

const LoanCalculator: React.FC<LoanCalculatorProps> = ({ memberData }) => {
  const navigate = useNavigate();
  
  // Default member data for demo
  const member = memberData || {
    totalSavings: 250000,
    contributionMonths: 8,
    creditScore: 680,
    activeLoans: 0,
    repaymentHistory: 'good' as const,
  };

  const [loanType, setLoanType] = useState<LoanFacilityKey>("revolving");
  const [loanAmount, setLoanAmount] = useState(200000);
  const [termMonths, setTermMonths] = useState(12);
  const [showComparison, setShowComparison] = useState(false);

  // Calculate maximum eligible loan based on member data
  const maxEligibleLoan = useMemo(() => {
    let maxLoan = member.totalSavings * 3; // Base: 3x savings
    
    // Adjust based on contribution history
    if (member.contributionMonths >= 12) maxLoan *= 1.2;
    else if (member.contributionMonths >= 6) maxLoan *= 1.0;
    else maxLoan *= 0.8;
    
    // Adjust based on credit score
    if (member.creditScore >= 750) maxLoan *= 1.3;
    else if (member.creditScore >= 650) maxLoan *= 1.1;
    else if (member.creditScore < 550) maxLoan *= 0.7;
    
    // Reduce if has active loans
    if (member.activeLoans > 0) maxLoan *= 0.5;
    
    return Math.min(Math.round(maxLoan / 10000) * 10000, 5000000);
  }, [member]);

  const facility = getLoanFacility(loanType);
  const interestRateType = facility?.interestRateType || "annual";
  const interestRate =
    facility?.interestRate ??
    facility?.interestRateRange?.min ??
    0;
  const interestLabel = formatInterestLabel(
    interestRate,
    interestRateType,
    facility?.interestRateRange,
  );
  const termOptions = getLoanTermOptions(loanType, addMonths(new Date(), 1));
  const termMin = termOptions.length > 0 ? termOptions[0] : 3;
  const termMax =
    termOptions.length > 0 ? termOptions[termOptions.length - 1] : 36;

  useEffect(() => {
    if (termOptions.length === 0) return;
    if (!termOptions.includes(termMonths)) {
      setTermMonths(termOptions[0]);
    }
  }, [loanType, termOptions.join(","), termMonths]);

  // Calculate loan details
  const loanDetails = useMemo(() => {
    return calculateLoanSummary({
      principal: loanAmount,
      rate: interestRate,
      rateType: interestRateType,
      months: termMonths,
    });
  }, [loanAmount, termMonths, interestRate, interestRateType]);

  // Compare different terms
  const termComparisons = useMemo(() => {
    const terms = termOptions.length > 0 ? termOptions : [6, 12, 18, 24, 36];
    return terms.map(months => {
      const summary = calculateLoanSummary({
        principal: loanAmount,
        rate: interestRate,
        rateType: interestRateType,
        months,
      });
      
      return {
        months,
        rate: interestRate,
        monthlyPayment: summary.monthlyPayment,
        totalInterest: summary.totalInterest,
      };
    });
  }, [loanAmount, termOptions.join(","), interestRate, interestRateType]);

  // Eligibility requirements
  const eligibilityRequirements = [
    {
      name: 'Minimum 3 months contributions',
      met: member.contributionMonths >= 3,
      current: `${member.contributionMonths} months`,
      required: '3 months',
    },
    {
      name: 'Minimum credit score of 500',
      met: member.creditScore >= 500,
      current: member.creditScore.toString(),
      required: '500',
    },
    {
      name: 'No active loan defaults',
      met: member.repaymentHistory !== 'poor',
      current: member.repaymentHistory,
      required: 'Fair or better',
    },
    {
      name: 'Savings balance requirement',
      met: member.totalSavings >= loanAmount * 0.2,
      current: `₦${member.totalSavings.toLocaleString()}`,
      required: `₦${(loanAmount * 0.2).toLocaleString()} (20% of loan)`,
    },
  ];

  const isEligible = eligibilityRequirements.every(req => req.met);

  // Progress to next tier
  const nextTierAmount = maxEligibleLoan < 1000000 ? 1000000 : 
                         maxEligibleLoan < 2000000 ? 2000000 : 
                         maxEligibleLoan < 5000000 ? 5000000 : null;
  
  const progressToNextTier = nextTierAmount 
    ? Math.min(100, (maxEligibleLoan / nextTierAmount) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Calculator Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Loan Calculator</h2>
            <p className="text-emerald-100">Estimate your loan eligibility and payments</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-emerald-100 text-sm">Max Eligible</p>
            <p className="text-2xl font-bold">₦{(maxEligibleLoan / 1000000).toFixed(1)}M</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-emerald-100 text-sm">Your Rate</p>
            <p className="text-2xl font-bold">{interestLabel}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-emerald-100 text-sm">Credit Score</p>
            <p className="text-2xl font-bold">{member.creditScore}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-emerald-100 text-sm">Savings</p>
            <p className="text-2xl font-bold">₦{(member.totalSavings / 1000).toFixed(0)}K</p>
          </div>
        </div>
      </div>

      {/* Facility Selection */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Loan Facility</h3>
        <div className="flex flex-wrap gap-2">
          {LOAN_FACILITIES.map((facilityOption) => {
            const available = isLoanFacilityAvailable(facilityOption.key);
            const label = formatInterestLabel(
              facilityOption.interestRate ?? facilityOption.interestRateRange?.min ?? 0,
              facilityOption.interestRateType,
              facilityOption.interestRateRange,
            );

            return (
              <button
                key={facilityOption.key}
                onClick={() => available && setLoanType(facilityOption.key)}
                disabled={!available}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  loanType === facilityOption.key
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
                } ${!available ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {facilityOption.name} ({label})
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Loan Amount Slider */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Loan Amount
            </h3>
            
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  ₦{loanAmount.toLocaleString()}
                </span>
                {loanAmount > maxEligibleLoan && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Exceeds eligibility
                  </span>
                )}
              </div>
              <Slider
                value={[loanAmount]}
                onValueChange={(value) => setLoanAmount(value[0])}
                min={50000}
                max={5000000}
                step={10000}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>₦50,000</span>
                <span className="text-emerald-600 font-medium">Max: ₦{maxEligibleLoan.toLocaleString()}</span>
                <span>₦5,000,000</span>
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-600" />
              Loan Term
            </h3>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  {termMonths} months
                </span>
                <span className="text-gray-500">({(termMonths / 12).toFixed(1)} years)</span>
              </div>
              <Slider
                value={[termMonths]}
                onValueChange={(value) => setTermMonths(value[0])}
                min={termMin}
                max={termMax}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>{termMin} months</span>
                <span>{termMax} months</span>
              </div>
            </div>

            {/* Quick Term Selection */}
            <div className="flex flex-wrap gap-2">
              {(termOptions.length > 0 ? termOptions : [6, 12, 18, 24, 36]).map((months) => (
                <button
                  key={months}
                  onClick={() => setTermMonths(months)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    termMonths === months
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {months} months
                </button>
              ))}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Payment Summary</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-emerald-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Monthly Payment</p>
                <p className="text-2xl font-bold text-emerald-600">
                  ₦{loanDetails.monthlyPayment.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Total Interest</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₦{loanDetails.totalInterest.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Total Payment</p>
                <p className="text-2xl font-bold text-purple-600">
                  ₦{loanDetails.totalPayment.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl mb-4">
              <Percent className="h-5 w-5 text-gray-500" />
              <span className="text-gray-600">Interest Rate:</span>
              <span className="font-semibold text-gray-900">{interestLabel}</span>
              {member.creditScore >= 700 && (
                <span className="ml-auto px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  Preferred Member
                </span>
              )}
            </div>

            <Button
              onClick={() => setShowComparison(!showComparison)}
              variant="outline"
              className="w-full gap-2"
            >
              {showComparison ? 'Hide' : 'Compare'} Different Terms
              <ChevronRight className={`h-4 w-4 transition-transform ${showComparison ? 'rotate-90' : ''}`} />
            </Button>

            {showComparison && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Term</th>
                      <th className="text-left py-3 px-2">Rate</th>
                      <th className="text-left py-3 px-2">Monthly</th>
                      <th className="text-left py-3 px-2">Total Interest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {termComparisons.map((term) => (
                      <tr 
                        key={term.months}
                        className={`border-b hover:bg-gray-50 cursor-pointer ${
                          term.months === termMonths ? 'bg-emerald-50' : ''
                        }`}
                        onClick={() => setTermMonths(term.months)}
                      >
                        <td className="py-3 px-2 font-medium">{term.months} months</td>
                        <td className="py-3 px-2">{interestLabel}</td>
                        <td className="py-3 px-2">₦{term.monthlyPayment.toLocaleString()}</td>
                        <td className="py-3 px-2">₦{term.totalInterest.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Eligibility Sidebar */}
        <div className="space-y-6">
          {/* Eligibility Status */}
          <div className={`rounded-xl border p-6 ${isEligible ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              {isEligible ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <AlertCircle className="h-8 w-8 text-amber-600" />
              )}
              <div>
                <h3 className={`font-semibold ${isEligible ? 'text-green-900' : 'text-amber-900'}`}>
                  {isEligible ? 'You\'re Eligible!' : 'Almost There'}
                </h3>
                <p className={`text-sm ${isEligible ? 'text-green-700' : 'text-amber-700'}`}>
                  {isEligible 
                    ? 'You meet all requirements for this loan'
                    : 'Some requirements need attention'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {eligibilityRequirements.map((req, index) => (
                <div key={index} className="flex items-start gap-2">
                  {req.met ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${req.met ? 'text-green-900' : 'text-amber-900'}`}>
                      {req.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      Current: {req.current} | Required: {req.required}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {isEligible && loanAmount <= maxEligibleLoan && (
              <Button
                onClick={() => navigate('/loan-application', { state: { amount: loanAmount, term: termMonths, loanType } })}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
              >
                Apply for This Loan
              </Button>
            )}
          </div>

          {/* Progress to Next Tier */}
          {nextTierAmount && (
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Unlock Higher Limits</h3>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Progress to ₦{(nextTierAmount / 1000000).toFixed(0)}M</span>
                  <span className="font-medium text-purple-600">{progressToNextTier.toFixed(0)}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressToNextTier}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-gray-600">To qualify for higher limits:</p>
                <ul className="space-y-1 text-gray-700">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                    Increase your savings
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                    Maintain consistent contributions
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                    Improve your credit score
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Credit Score Impact */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-gray-900">Credit Score Impact</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Your Score</span>
                <span className={`font-bold ${
                  member.creditScore >= 750 ? 'text-green-600' :
                  member.creditScore >= 650 ? 'text-emerald-600' :
                  member.creditScore >= 550 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {member.creditScore}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 space-y-2">
                <p className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Higher scores = better approval odds and higher limits
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="p-2 bg-green-50 rounded text-center">
                    <p className="text-xs text-gray-500">750+</p>
                    <p className="font-medium text-green-700">Top tier limits</p>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded text-center">
                    <p className="text-xs text-gray-500">650-749</p>
                    <p className="font-medium text-emerald-700">Higher limits</p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => navigate('/credit-score')}
            >
              View Credit Score Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanCalculator;
