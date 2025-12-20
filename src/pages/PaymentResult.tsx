import { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';

type ResultType = 'success' | 'failed' | 'cancelled';

interface PaymentResultPageProps {
  type: ResultType;
}

const PaymentResultPage = ({ type }: PaymentResultPageProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const transactionId = searchParams.get('tran_id');

  const configs = {
    success: {
      icon: CheckCircle2,
      iconClass: 'text-green-500',
      title: 'Payment Successful!',
      titleBn: 'পেমেন্ট সফল হয়েছে!',
      message: 'Thank you for your payment. Your subscription has been activated.',
      messageBn: 'আপনার পেমেন্টের জন্য ধন্যবাদ। আপনার সাবস্ক্রিপশন সক্রিয় করা হয়েছে।',
      bgClass: 'bg-green-50 dark:bg-green-950/20',
    },
    failed: {
      icon: XCircle,
      iconClass: 'text-red-500',
      title: 'Payment Failed',
      titleBn: 'পেমেন্ট ব্যর্থ হয়েছে',
      message: 'Unfortunately, your payment could not be processed. Please try again.',
      messageBn: 'দুঃখিত, আপনার পেমেন্ট প্রক্রিয়া করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
      bgClass: 'bg-red-50 dark:bg-red-950/20',
    },
    cancelled: {
      icon: AlertCircle,
      iconClass: 'text-yellow-500',
      title: 'Payment Cancelled',
      titleBn: 'পেমেন্ট বাতিল করা হয়েছে',
      message: 'You cancelled the payment. No charges were made.',
      messageBn: 'আপনি পেমেন্ট বাতিল করেছেন। কোনো চার্জ করা হয়নি।',
      bgClass: 'bg-yellow-50 dark:bg-yellow-950/20',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  useEffect(() => {
    // Redirect to dashboard after 5 seconds on success
    if (type === 'success') {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [type, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className={`max-w-md w-full ${config.bgClass}`}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Icon className={`h-16 w-16 ${config.iconClass}`} />
          </div>
          <CardTitle className="text-2xl">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{config.message}</p>
          
          {transactionId && (
            <div className="bg-background/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Transaction ID</p>
              <p className="font-mono text-sm">{transactionId}</p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Link to="/dashboard">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
            {type !== 'success' && (
              <Link to="/pricing">
                <Button variant="outline" className="w-full">
                  Try Again
                </Button>
              </Link>
            )}
          </div>

          {type === 'success' && (
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard in 5 seconds...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const PaymentSuccess = () => <PaymentResultPage type="success" />;
export const PaymentFailed = () => <PaymentResultPage type="failed" />;
export const PaymentCancelled = () => <PaymentResultPage type="cancelled" />;
