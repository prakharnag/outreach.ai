"use client";

import { useEffect, useState } from "react";
import { Search, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "./card";

interface ResearchSpinnerProps {
  status: {
    research?: string;
    verify?: string;
    messaging?: string;
  };
  loading: boolean;
}

export function ResearchSpinner({ status, loading }: ResearchSpinnerProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      key: 'research',
      label: 'Performing company research…',
      description: 'AI searching websites, blogs, LinkedIn, and news sources',
      icon: Search
    },
    {
      key: 'verify',
      label: 'Verifying pulled data…',
      description: 'Fact-checking and validating company information',
      icon: CheckCircle
    },
    {
      key: 'messaging',
      label: 'Generating LinkedIn message…',
      description: 'Creating personalized cold email and LinkedIn message',
      icon: Loader2
    }
  ];

  useEffect(() => {
    if (status.research === 'complete' && currentStep < 1) {
      setCurrentStep(1);
    }
    if (status.verify === 'complete' && currentStep < 2) {
      setCurrentStep(2);
    }
    if (status.messaging === 'complete') {
      setCurrentStep(3);
    }
  }, [status, currentStep]);

  if (!loading) return null;

  return (
    <Card className="shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              AI Agents Working
            </h3>
            <p className="text-blue-700">
              Please wait while we research and generate your outreach materials
            </p>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => {
              const isActive = currentStep === index;
              const isCompleted = currentStep > index;
              const stepStatus = status[step.key as keyof typeof status];
              
              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-all duration-300 ${
                    isActive 
                      ? 'bg-blue-100 border-2 border-blue-300' 
                      : isCompleted 
                        ? 'bg-green-50 border-2 border-green-200' 
                        : 'bg-slate-50 border-2 border-slate-200'
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted 
                      ? 'bg-green-500' 
                      : isActive 
                        ? 'bg-blue-500' 
                        : 'bg-slate-300'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <step.icon className="h-5 w-5 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className={`font-medium ${
                      isCompleted 
                        ? 'text-green-800' 
                        : isActive 
                          ? 'text-blue-800' 
                          : 'text-slate-600'
                    }`}>
                      {step.label}
                      {stepStatus && (
                        <span className="ml-2 text-sm font-normal">
                          ({stepStatus})
                        </span>
                      )}
                    </div>
                    <div className={`text-sm ${
                      isCompleted 
                        ? 'text-green-600' 
                        : isActive 
                          ? 'text-blue-600' 
                          : 'text-slate-500'
                    }`}>
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-blue-100 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm text-blue-800">
              <span>Progress</span>
              <span>{Math.round((currentStep / steps.length) * 100)}%</span>
            </div>
            <div className="mt-2 bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}