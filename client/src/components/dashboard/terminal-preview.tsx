import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TerminalPreview() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Terminal</CardTitle>
          <Button variant="outline" size="sm" data-testid="button-open-terminal">
            Open Full Terminal
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-4 rounded-b-lg">
          <div className="font-mono text-sm space-y-1 text-green-400">
            <div className="text-gray-400">$ cd my-project</div>
            <div>$ npm install</div>
            <div className="text-gray-400">npm WARN deprecated...</div>
            <div>$ node app.js</div>
            <div className="text-blue-400">Server running on port 3000</div>
            <div className="flex items-center">
              <span>$ </span>
              <span className="animate-pulse ml-1">|</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
