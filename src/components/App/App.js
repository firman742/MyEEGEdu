import React from "react";
import { PageSwitcher } from "../PageSwitcher/PageSwitcher";
import { AppProvider, Card, Page, Link } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import * as translations from "./translations/en.json";

export function App() {
  return (
    <AppProvider i18n={enTranslations}>
      <Page title={translations.title} subtitle={translations.subtitle}>
        <PageSwitcher />
      </Page>
    </AppProvider>
  );
}
