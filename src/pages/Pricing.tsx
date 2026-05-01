import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check, Crown, Zap, Star, ArrowLeft, Loader2 } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_quarterly: number | null;
  price_yearly: number | null;
  max_applications_per_month: number | null;
  featured_profile: boolean | null;
  priority_support: boolean | null;
}

const Pricing = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });
    
    if (data) setPlans(data);
    setLoading(false);
  };

  const handleSubscribe = async (plan: Plan) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to subscribe to a plan',
        variant: 'destructive',
      });
      return;
    }

    if (plan.price_monthly === 0) {
      // Free plan - just create subscription
      await supabase.from('user_subscriptions').upsert({
        user_id: user.id,
        plan_id: plan.id,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        applications_used: 0,
      }, { onConflict: 'user_id' });

      toast({
        title: 'Success!',
        description: 'You are now on the Free plan',
      });
      return;
    }

    setProcessingPlanId(plan.id);

    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', user.id)
        .single();

      const response = await supabase.functions.invoke('sslcommerz-init', {
        body: {
          amount: plan.price_monthly,
          productName: `${plan.name} Subscription`,
          productCategory: 'Subscription',
          customerName: profile?.full_name || 'Customer',
          customerEmail: profile?.email || user.email,
          customerPhone: profile?.phone || '01700000000',
          userId: user.id,
          planId: plan.id,
        },
      });

      if (response.data?.success && response.data?.gatewayUrl) {
        window.location.href = response.data.gatewayUrl;
      } else {
        throw new Error(response.data?.error || 'Failed to initiate payment');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Payment initialization failed';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setProcessingPlanId(null);
    }
  };

  const getPlanIcon = (name: string) => {
    if (name.toLowerCase().includes('premium')) return Crown;
    if (name.toLowerCase().includes('basic')) return Zap;
    return Star;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Header />

      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge className="mb-4">Pricing</Badge>
          <h1 className="text-4xl font-extrabold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground">
            Unlock more opportunities and grow your tutoring career with our subscription plans
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-[1200px] mx-auto">
          {plans.map((plan, index) => {
            const Icon = getPlanIcon(plan.name);
            const isPopular = index === 1; // Middle plan is "popular"
            
            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-all hover:shadow-xl ${
                  isPopular ? 'border-2 border-primary shadow-lg scale-105' : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-medium rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                    isPopular ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold">৳{plan.price_monthly}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  
                  <ul className="space-y-3 text-left">
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>
                        {plan.max_applications_per_month === null
                          ? 'Unlimited applications'
                          : `${plan.max_applications_per_month} applications/month`}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className={`h-5 w-5 flex-shrink-0 ${plan.featured_profile ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span className={plan.featured_profile ? '' : 'text-muted-foreground'}>
                        Featured profile badge
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className={`h-5 w-5 flex-shrink-0 ${plan.priority_support ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span className={plan.priority_support ? '' : 'text-muted-foreground'}>
                        Priority support
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Access to all job listings</span>
                    </li>
                  </ul>
                </CardContent>
                
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isPopular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan)}
                    disabled={processingPlanId === plan.id}
                  >
                    {processingPlanId === plan.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : plan.price_monthly === 0 ? (
                      'Get Started Free'
                    ) : (
                      'Subscribe Now'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Payment Methods */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-4">Secure payments powered by</p>
          <div className="flex items-center justify-center gap-8 opacity-60">
            <img src="https://securepay.sslcommerz.com/public/image/sslcommerz.png" alt="SSLCommerz" className="h-8" />
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Pay with bKash, Nagad, Rocket, Visa, Mastercard, and more
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Pricing;
