# 0015. The automation course teaches Playwright with TypeScript in depth

Date: 2026-11-03
Status: Accepted

## Context

The owner wants all three major browser automation tools introduced, with depth in the one that
has the most industry coverage. Current data, almost all from vendor blogs with no published
method, points two ways. New adoption clearly favours Playwright (about 33M weekly npm downloads
against 6.6M for Cypress and 2.1M for `selenium-webdriver`, February 2026). Job-posting counts
disagree on whether Selenium or Playwright leads. Selenium keeps steady demand in enterprises with
older suites, and Cypress has stopped gaining.

## Decision

- **Playwright with TypeScript** is the depth tool and language. The main path, the portfolio
  framework and the capstone use it.
- **Selenium WebDriver in Java** is taught second, with a Java bridge, as a full module rather than
  a mention. It matches enterprise job ads, and Appium (the mobile track) speaks the same WebDriver
  protocol.
- **Cypress** gets one comparison module, explaining how its in-browser architecture changes what a
  test can do.
- Every tool is taught through the decision criteria that outlive it: team language, application
  architecture, browser coverage, feedback speed, debuggability, cost and maintainability.

## Alternatives considered

- **Selenium with Java as the depth tool.** Lost because it shares nothing with the full-stack
  course's TypeScript modules and is losing ground on new projects, though it may still lead in
  job-ad volume.
- **Python.** Lost because it shares no lessons with the full-stack course. Its job-market share was
  not checked.

## Consequences

Easier: the language modules are shared with the full-stack course, and the learner's portfolio
matches where new projects are heading. Harder: learners targeting Java-only employers depend on
one transfer module plus their own practice. Revisit if a neutral source (a job-board report or a
survey with a published method) shows Selenium/Java demand clearly dominant in the learners' target
market.
