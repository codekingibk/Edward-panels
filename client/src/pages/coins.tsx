
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Coins as CoinsIcon, ShoppingCart } from "lucide-react";

export default function Coins() {
  const { user } = useAuth();

  const coinPackage = { name: "Full Refill", coins: 1000, price: "₦200" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CoinsIcon className="h-6 w-6" />
          Buy Coins
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-2xl font-bold">
            <CoinsIcon className="h-6 w-6 text-yellow-500" />
            {user?.coinBalance?.toLocaleString() || 0} coins
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <CardTitle>{coinPackage.name}</CardTitle>
            <div className="text-4xl font-bold text-primary">{coinPackage.price}</div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <CoinsIcon className="h-6 w-6 text-yellow-500" />
              <span className="text-2xl font-semibold">{coinPackage.coins.toLocaleString()} coins</span>
            </div>
            <p className="text-sm text-muted-foreground">Get your account fully refilled</p>
            <Button 
              className="w-full"
              onClick={() => {
                const message = `Hello! I want to purchase the Full Refill package (₦200 for 1000 coins).\n\nAccount Details:\nUsername: ${user?.username}\nEmail: ${user?.email}\nUser ID: ${user?.id}\nCurrent Balance: ${user?.coinBalance} coins\n\nPlease process my account refill. Thank you!`;
                const whatsappUrl = `https://wa.me/2347019706826?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
              }}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Purchase via WhatsApp
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <CardTitle>Need Help?</CardTitle>
            <div className="text-2xl font-bold text-green-600">Contact Developer</div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Have questions about your account, need technical support, or want to report an issue?
            </p>
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => {
                const message = `Hello! I need help with my Edward Panels account.\n\nAccount Details:\nUsername: ${user?.username}\nEmail: ${user?.email}\nUser ID: ${user?.id}\nCurrent Balance: ${user?.coinBalance} coins\n\nIssue: [Please describe your issue here]`;
                const whatsappUrl = `https://wa.me/2347019706826?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
              }}
            >
              Contact Developer
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What can you do with coins?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-muted-foreground">
            <li>• Create new projects</li>
            <li>• Upgrade project resources</li>
            <li>• Access premium features</li>
            <li>• Increase storage limits</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
