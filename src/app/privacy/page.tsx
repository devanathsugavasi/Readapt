import Header from '@/components/Header';
import Footer from '@/components/Footer';
import styles from './page.module.css';

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <Header minimalWhenAuthed />
      <main className={styles.main}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.meta}>Effective date: April 18, 2026</p>

        <section className={styles.section}>
          <h2>1. Scope and Overview</h2>
          <p>
            This Privacy Policy explains how Readapt (&quot;Readapt,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;)
            collects, uses, stores, and protects information when you use our website, web application,
            and Chrome extension.
          </p>
          <p>
            Readapt is designed to provide ADHD-friendly reading adaptation. We process only the information
            needed to provide and improve that core service.
          </p>
          <p>
            This page applies to the free version of Readapt currently available at read-apt.vercel.app.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Information We Collect</h2>
          <p>Depending on how you use Readapt, we may collect the following categories of information:</p>
          <ul>
            <li>
              <strong>Account Information:</strong> email address, authentication identifiers, and basic profile metadata.
            </li>
            <li>
              <strong>Service Configuration Data:</strong> reading presets, focus settings, typography preferences,
              extension mode settings, and sync metadata.
            </li>
            <li>
              <strong>User-Provided Reading Text:</strong> text you paste or submit for adaptation and summary features.
            </li>
            <li>
              <strong>Operational Data:</strong> limited technical logs for security, performance, and reliability.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Website Content and Extension Behavior</h2>
          <p>
            The extension reads and transforms visible page text only to provide user-requested adaptation features
            such as inline/overlay mode, focus line, summary view, and text-to-speech controls.
          </p>
          <p>
            Extension settings are stored locally in browser storage for functionality. When you explicitly use sync,
            selected settings are exchanged between the Readapt website and extension so your experience remains consistent.
          </p>
          <p>
            We do not use website content for unrelated advertising purposes, and we do not sell personal data.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. How We Use Information</h2>
          <p>We use collected information to:</p>
          <ul>
            <li>authenticate users and secure accounts;</li>
            <li>deliver core adaptation features and personalization;</li>
            <li>sync settings between the website and extension when requested;</li>
            <li>maintain, troubleshoot, and improve service reliability and performance;</li>
            <li>communicate service updates, account notices, and support responses.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Legal Bases (Where Applicable)</h2>
          <p>Where required by applicable law, we process data based on one or more of the following:</p>
          <ul>
            <li>performance of a contract (providing the service you request);</li>
            <li>legitimate interests (security, fraud prevention, and service improvement);</li>
            <li>legal obligations; and/or</li>
            <li>your consent, where consent is required.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. Sharing and Disclosure</h2>
          <p>We may share data with service providers only as needed to operate Readapt, such as:</p>
          <ul>
            <li>authentication and database infrastructure providers;</li>
            <li>hosting and operational tooling providers.</li>
          </ul>
          <p>
            We may also disclose information when required by law, legal process, or to protect rights,
            security, and integrity of users and the service.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Data Retention</h2>
          <p>
            We retain information for as long as needed to provide the service, comply with legal obligations,
            resolve disputes, and enforce agreements. Retention periods vary by data type and operational need.
          </p>
          <p>
            You may request account deletion by contacting us. After a valid deletion request is completed,
            account-linked personal data will be removed or anonymized except where we are required to retain it by law.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Data Security</h2>
          <p>
            We use reasonable administrative, technical, and organizational safeguards to protect data against
            unauthorized access, disclosure, alteration, and destruction. No internet-based system can be guaranteed
            100% secure, but we continuously work to improve protections.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. International Transfers</h2>
          <p>
            Your information may be processed in countries other than your own. Where required, we apply appropriate
            safeguards for cross-border data transfers in accordance with applicable law.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Your Rights and Choices</h2>
          <p>Depending on your jurisdiction, you may have rights to:</p>
          <ul>
            <li>access, correct, or delete personal data;</li>
            <li>object to or restrict certain processing;</li>
            <li>request data portability; and</li>
            <li>withdraw consent where processing is based on consent.</li>
          </ul>
          <p>
            You may request account data correction or deletion by contacting us at joltmetric@gmail.com.
          </p>
        </section>

        <section className={styles.section}>
          <h2>11. Children&apos;s Privacy</h2>
          <p>
            Readapt is not intended for children under the age required by applicable law in your region.
            If you believe a child provided personal data without required consent, contact us and we will
            take appropriate steps.
          </p>
        </section>

        <section className={styles.section}>
          <h2>12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically. When we make material changes, we will update the
            effective date and, where appropriate, provide additional notice.
          </p>
        </section>

        <section className={styles.section}>
          <h2>13. Contact</h2>
          <p>For privacy questions or requests, contact: joltmetric@gmail.com</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
