"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { 
  Search, 
  Users, 
  MessageSquare, 
  Zap, 
  Brain, 
  Send, 
  Building, 
  ExternalLink,
  Check,
  Play,
  ArrowRight
} from "lucide-react";

export default function LandingPage() {
  const [isResearching, setIsResearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const router = useRouter();

  const handleResearch = async () => {
    if (!company || !role) return;
    setIsResearching(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsResearching(false);
    setShowResults(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-4xl lg:text-6xl font-bold text-navy tracking-tight">
              AI-Powered Outreach That{" "}
              <span className="text-gradient">Converts</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Research companies, find key contacts, and generate personalized messages 
              that get responses. All powered by advanced AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                onClick={() => window.location.href = '/?auth=true'}
              >
                Start Outreach Now
              </Button>
            </div>
            <div className="flex flex-wrap gap-8 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-navy">85%</div>
                <div className="text-sm text-muted-foreground">Response Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-navy">10x</div>
                <div className="text-sm text-muted-foreground">Faster Research</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-navy">50+</div>
                <div className="text-sm text-muted-foreground">Data Sources</div>
              </div>
            </div>
          </div>
          
          {/* Dashboard Mockup */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                <Search className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Company Research</span>
                <Badge className="ml-auto">Active</Badge>
              </div>
              <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl">
                <Users className="h-5 w-5 text-indigo-600" />
                <span className="font-medium">Contact Discovery</span>
                <Badge variant="secondary" className="ml-auto">Processing</Badge>
              </div>
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                <span className="font-medium">Message Generation</span>
                <Badge variant="outline" className="ml-auto">Queued</Badge>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-white rounded-full p-3 shadow-lg">
              <Zap className="h-6 w-6 text-yellow-500" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-navy mb-4">
            Everything You Need for Successful Outreach
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Our AI-powered platform handles the entire outreach process from research to personalized messaging.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: Search,
              title: "Smart Company Research",
              description: "AI searches websites, blogs, LinkedIn, and news to gather comprehensive company intelligence."
            },
            {
              icon: Users,
              title: "Key Contact Finder",
              description: "Automatically discovers decision makers with verified email addresses and LinkedIn profiles."
            },
            {
              icon: MessageSquare,
              title: "AI-Personalized Outreach",
              description: "Generates compelling cold emails and LinkedIn messages tailored to each prospect."
            },
            {
              icon: Zap,
              title: "Real-Time Formatting",
              description: "Watch as AI builds your outreach materials bullet-by-bullet in real-time."
            }
          ].map((feature, index) => (
            <Card key={index} className="feature-card group cursor-pointer">
              <CardContent className="p-6">
                <div className="p-3 rounded-2xl bg-blue-50 group-hover:bg-blue-100 transition-colors w-fit mb-4">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-navy mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-navy mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground">
            Get from prospect to personalized outreach in three simple steps
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "1",
              icon: Search,
              title: "Enter Company & Role",
              description: "Simply input the target company and role you're interested in reaching."
            },
            {
              step: "2", 
              icon: Brain,
              title: "AI Gathers Research",
              description: "Our AI scours the web to collect comprehensive company and contact intelligence."
            },
            {
              step: "3",
              icon: Send,
              title: "Get Ready Templates",
              description: "Receive personalized email and LinkedIn message templates ready to send."
            }
          ].map((step, index) => (
            <div key={index} className="text-center relative">
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <div className="p-3 rounded-2xl bg-blue-50 w-fit mx-auto mb-4">
                  <step.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-navy mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
              {index < 2 && (
                <ArrowRight className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 h-6 w-6 text-blue-300" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Demo */}
      <section className="container mx-auto px-6 py-20">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="grid lg:grid-cols-2">
            {/* Left Form */}
            <div className="p-8 lg:p-12 bg-gradient-to-br from-blue-50 to-indigo-50">
              <h3 className="text-2xl font-bold text-navy mb-6">Try It Now</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Company Name</label>
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Stripe, Shopify, Notion"
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Target Role</label>
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Head of Marketing, CTO"
                    className="bg-white"
                  />
                </div>
                <Button 
                  onClick={handleResearch}
                  disabled={!company || !role || isResearching}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  size="lg"
                >
                  {isResearching ? "Researching..." : "Start Research"}
                </Button>
              </div>
            </div>
            
            {/* Right Results */}
            <div className="p-8 lg:p-12">
              {!showResults && !isResearching && (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <Search className="h-12 w-12 text-blue-300 mx-auto mb-4" />
                    <p className="text-muted-foreground">Enter company details to see AI research in action</p>
                  </div>
                </div>
              )}
              
              {isResearching && (
                <div className="space-y-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-blue-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-blue-200 rounded w-1/2"></div>
                  </div>
                  <p className="text-blue-600 font-medium">AI is researching...</p>
                </div>
              )}
              
              {showResults && (
                <div className="space-y-6">
                  <Card className="border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-blue-900">
                        <Building className="h-5 w-5" />
                        Company Intelligence
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                          <span>Series B fintech company with $50M funding</span>
                          <ExternalLink className="h-3 w-3 text-blue-500 ml-auto flex-shrink-0" />
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                          <span>Recently launched new payment API platform</span>
                          <ExternalLink className="h-3 w-3 text-blue-500 ml-auto flex-shrink-0" />
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-indigo-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-indigo-900">
                        <Users className="h-5 w-5" />
                        Key Contacts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        <div className="font-medium">Sarah Chen - Head of Marketing</div>
                        <div className="text-muted-foreground">sarah.chen@company.com</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-purple-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-purple-900">
                        <MessageSquare className="h-5 w-5" />
                        Personalized Outreach
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        &ldquo;Hi Sarah, I noticed your recent API launch and thought you might be interested in...&rdquo;
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 text-center text-white">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to Transform Your Outreach Game?
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of sales professionals who&apos;ve increased their response rates with AI-powered outreach.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 max-w-2xl mx-auto">
            {[
              "No credit card required",
              "5 free research credits", 
              "Full platform access",
              "Cancel anytime"
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-300" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50"
              onClick={() => { window.location.href = '/?auth=true'; }}
            >
              Get Started for Free
            </Button>
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
              Book a Demo
              Book a Demo
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}