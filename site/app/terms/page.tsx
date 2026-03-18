import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — tidal-cli",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <a
          href="/"
          className="text-sm text-tidal-gray-400 hover:text-white transition-colors mb-8 inline-block"
        >
          &larr; Back to home
        </a>

        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-tidal-gray-400 mb-12">
          Last updated: March 18, 2026
        </p>

        <div className="space-y-8 text-tidal-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Overview</h2>
            <p>
              tidal-cli is a free, open-source tool that connects to the Tidal
              music streaming service. By using tidal-cli (the CLI tool or the
              MCP connector), you agree to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Service Description
            </h2>
            <p>
              tidal-cli provides a command-line interface and an MCP (Model
              Context Protocol) server that allows you to interact with your
              Tidal account. It enables searching the Tidal catalog, managing
              playlists, browsing your library, and accessing playback
              information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Requirements
            </h2>
            <ul className="list-disc list-inside mt-3 space-y-1">
              <li>A valid Tidal subscription (Free, HiFi, or HiFi Plus)</li>
              <li>
                You must comply with{" "}
                <a
                  href="https://tidal.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tidal-cyan hover:underline"
                >
                  Tidal&apos;s Terms of Use
                </a>
              </li>
              <li>You are responsible for all actions taken through your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-3 space-y-1">
              <li>Use tidal-cli for any unlawful purpose</li>
              <li>Attempt to circumvent Tidal&apos;s access controls or DRM</li>
              <li>Use the service to download or redistribute copyrighted content</li>
              <li>Abuse the API with excessive or automated requests beyond normal use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Disclaimer of Warranties
            </h2>
            <p>
              tidal-cli is provided <strong className="text-white">&quot;as is&quot;</strong> without
              warranty of any kind, express or implied. The maintainer does not
              guarantee uninterrupted or error-free operation. Tidal may change
              their API at any time, which could affect functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Limitation of Liability
            </h2>
            <p>
              The maintainer of tidal-cli shall not be liable for any damages
              arising from the use or inability to use this service, including
              but not limited to loss of data, loss of access to your Tidal
              account, or any indirect or consequential damages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Third-Party Services
            </h2>
            <p>
              tidal-cli connects to Tidal&apos;s API services. Your use of Tidal is
              governed by their own{" "}
              <a
                href="https://tidal.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tidal-cyan hover:underline"
              >
                Terms of Use
              </a>{" "}
              and{" "}
              <a
                href="https://tidal.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tidal-cyan hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Changes to Terms
            </h2>
            <p>
              These terms may be updated from time to time. Continued use of
              tidal-cli after changes constitutes acceptance of the updated
              terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Open Source License
            </h2>
            <p>
              tidal-cli is licensed under the{" "}
              <a
                href="https://github.com/lucaperret/tidal-cli/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tidal-cyan hover:underline"
              >
                MIT License
              </a>
              . The source code is available at{" "}
              <a
                href="https://github.com/lucaperret/tidal-cli"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tidal-cyan hover:underline"
              >
                github.com/lucaperret/tidal-cli
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
            <p>
              For questions about these terms, open an issue on{" "}
              <a
                href="https://github.com/lucaperret/tidal-cli/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tidal-cyan hover:underline"
              >
                GitHub
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
