import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, Terminal, Coins, Users, Shield, Zap } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Server className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Edward Panels</h1>
                <p className="text-xs text-muted-foreground">Node.js Hosting</p>
              </div>
            </div>
            <Button onClick={handleLogin} data-testid="button-login">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Node.js Hosting <br />
            <span className="text-primary">Made Simple</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Deploy, manage, and scale your Node.js applications with our powerful hosting panel. 
            Built for developers, by developers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleLogin} data-testid="button-get-started">
              Get Started Free
            </Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Why Choose Edward Panels?</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Terminal className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Integrated Terminal</CardTitle>
                <CardDescription>
                  Full terminal access for each project with npm, node, and all standard commands
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Coins className="h-8 w-8 text-accent mb-2" />
                <CardTitle>Coin-Based Economy</CardTitle>
                <CardDescription>
                  Fair pay-as-you-go system. Start with free coins and purchase more as needed
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Zap className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Instant Deployment</CardTitle>
                <CardDescription>
                  Deploy your Node.js apps instantly with one click. No complex configuration required
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Project Management</CardTitle>
                <CardDescription>
                  Organize multiple projects with file management, version control, and team collaboration
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Secure & Isolated</CardTitle>
                <CardDescription>
                  Each project runs in its own secure environment with dedicated resources
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Server className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Real-time Monitoring</CardTitle>
                <CardDescription>
                  Monitor your applications with real-time logs, metrics, and performance insights
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl font-bold mb-6">Ready to Get Started?</h3>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of developers who trust Edward Panels for their Node.js hosting needs.
          </p>
          <Button size="lg" onClick={handleLogin} data-testid="button-start-free">
            Start Your Free Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 Edward Panels. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
