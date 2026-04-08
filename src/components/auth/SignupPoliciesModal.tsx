import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BadgeCheck, FileText, Shield, Users } from "lucide-react";
import crcLogo from "@/assets/branding/crc-logo.jpeg";

type PolicyTab = "terms" | "privacy";

type Section = {
  id: string;
  title: string;
  description?: string;
  items?: string[];
  notes?: string[];
  subSections?: { title: string; items: string[] }[];
};

const termsSections: Section[] = [
  {
    id: "interpretation",
    title: "Interpretation & Definitions",
    description:
      "Key definitions that guide how the principles are applied.",
    items: [
      "Financial year: 1st January to 31st December.",
      "Revolving period: January to October (October is for cleaning up the revolving cycle).",
      "Bridging period: October to January (January is for cleaning up the bridging cycle).",
      "Ending of the month: 27th of the outgoing month to 4th of the incoming month.",
      "Management committee: Chief Coordinator, Assistant Chief Coordinators, Legal Adviser, Consultant.",
    ],
  },
  {
    id: "name-address",
    title: "Name & Address",
    items: [
      "Champions Revolving Contributions (CRC).",
      "Ogun Baptist Conference Secretariat, Opposite Government Technical College, Idi Aba, Abeokuta, Ogun State.",
    ],
  },
  {
    id: "objective",
    title: "Objective",
    items: [
      "Encourage financial stability.",
      "Provide financial empowerment.",
    ],
  },
  {
    id: "membership",
    title: "Membership",
    items: [
      "Open to people of like minds, male and female, across all occupations (petty traders, salary earners, artisans, self-employed, and other business men and women).",
      "Prospective members are admitted by completing the online membership application form with a token of ₦2,000 only.",
    ],
  },
  {
    id: "activities",
    title: "Activities",
    items: [
      "Contributions of money.",
      "Loaning of money at minimal interest.",
      "Providing working tools for members at a reasonable amount.",
      "Purchasing household commodities at affordable prices.",
    ],
  },
  {
    id: "termination",
    title: "Termination of Membership",
    items: [
      "Voluntary withdrawal.",
      "Permanent disability.",
      "Death.",
    ],
  },
  {
    id: "expulsion",
    title: "Expulsion",
    items: [
      "Failure to make contributions repeatedly.",
      "Failure to repay loan.",
      "Criminal conviction by a court of law.",
      "Any other acts contrary to the stated objective and interest of the association.",
    ],
  },
  {
    id: "leadership",
    title: "Leadership",
    items: [
      "Chief Coordinator.",
      "Assistant Chief Coordinators.",
      "Group Coordinators.",
      "Legal Adviser.",
      "Consultant.",
    ],
  },
  {
    id: "duties",
    title: "Duties of Officers",
    subSections: [
      {
        title: "Chief Coordinator",
        items: [
          "Overall coordinator of the savings scheme.",
          "Presides over all meetings.",
          "Oversees the activities of the programme as a whole.",
        ],
      },
      {
        title: "Assistant Chief Coordinators (3)",
        items: [
          "Assistant 1 (Treasurer): takes charge of all monies received and makes disbursements as directed by the Chief Coordinator.",
          "Assistant 2 (Secretary): keeps accurate records, calls for meetings, and records proceedings.",
          "Assistant 3 (Financial Secretary): records all money paid in/out; manages sales of forms and financial documents.",
        ],
      },
      {
        title: "Group Coordinators",
        items: [
          "Sell membership and loan forms to prospective members.",
          "Ensure forms are properly filled and submitted.",
          "Collect contributions and keep adequate group records.",
          "Loan disbursement and repayments are made through them as due.",
          "By October ending, all group loans must be fully paid; otherwise no member in the group receives contributions.",
        ],
      },
      {
        title: "Legal Adviser",
        items: [
          "Represents the association in legal matters and gives legal advice.",
        ],
      },
      {
        title: "Consultant",
        items: [
          "Assists the Chief Coordinator to oversee the affairs of the association.",
        ],
      },
    ],
  },
  {
    id: "opportunities",
    title: "Opportunities",
    subSections: [
      {
        title: "Saving Opportunity",
        items: [
          "Revolving contribution: uniform monthly amount January–October; minimum ₦5,000; voluntary but compulsory once opted in; withdrawals only at October ending.",
          "Special contribution: voluntary bulk contribution (minimum ₦1,000,000) paid end of January to end of October; withdrawable monthly; interest paid by end of October.",
          "Endwell contribution: monthly savings towards retirement or minimum 5 years; minimum ₦5,000; notify one month before collection.",
          "Festival contribution: monthly savings for a specific festival; minimum ₦5,000; withdrawable only for that festival.",
        ],
      },
      {
        title: "Loan Opportunity",
        items: [
          "Revolving loan: up to total contribution for ten months; 3.5% interest per month.",
          "Special loan: for creditworthy members; 3.5% interest per month; available end of April; repay by October ending.",
          "Bridging loan: October–December; repay by end of January; interest 4%–10%; for 2–3 months, interest is added to principal and repaid in equal installments.",
          "Soft loan: available end of November and December; 25% interest repaid equally over 10 months (e.g., ₦100,000 + 25% = ₦125,000; ₦12,500 monthly).",
        ],
        notes: [
          "Only the revolving loan window is open to new members and can be obtained after the 4th month's contribution.",
          "Loan forms are obtained through Group Coordinators.",
        ],
      },
      {
        title: "Other Opportunities",
        items: [
          "Empowerment tools (motor bike, sewing machine, tricycle, vehicle, grinding machine, etc.) at reasonable amounts.",
          "Household commodities such as electronics and foodstuff at affordable prices.",
        ],
      },
    ],
  },
  {
    id: "rules",
    title: "Rules & Regulations",
    items: [
      "All contributions are made within 6–9 days, from 27th of the outgoing month to 4th of the incoming month.",
      "No member should delay contributions, especially while on loan.",
      "Loan periods: Revolving (Jan–Sep, repay by Oct end), Special (Apr–Sep, repay by Oct end), Bridging (Oct–Dec, repay by Jan end), Soft (Nov–Dec, repay over 10 months).",
      "Granting of loans depends on availability of funds and management discretion; new members and soft-loan members are not granted loans until end of April.",
      "All contributors must belong to a group led by a Group Coordinator.",
      "All forms must be obtained and submitted via Group Coordinators.",
      "All payments and approved loans must be transacted through Group Coordinators.",
      "All loans must be repaid by end of October (bridging loans by end of January).",
      "Members on loan have a maximum of one week after October salary payment to settle debts.",
      "Management has one week after the last payment (equivalent to two weeks from 4th November) for accountability and distribution.",
      "No member in a group with an unpaid debtor receives their contribution until the debt is settled.",
    ],
  },
  {
    id: "review",
    title: "Review of Guiding Principles",
    items: ["These guiding principles are subject to review and amendment from time to time."],
  },
  {
    id: "contact",
    title: "Contact",
    items: [
      "08060707575",
      "07039362614",
      "07038595644",
      "08027148935",
      "08033374418",
    ],
  },
];

const privacySections: Section[] = [
  {
    id: "overview",
    title: "Privacy Overview",
    description:
      "This summary reflects how CRC handles personal information based on its guiding principles and operational structure.",
  },
  {
    id: "data-collected",
    title: "Information We Collect",
    items: [
      "Details submitted on membership and loan application forms.",
      "Contribution, repayment, and group participation records.",
      "Coordinator submissions required for managing member activities.",
    ],
  },
  {
    id: "usage",
    title: "How We Use Information",
    items: [
      "To admit and onboard members.",
      "To manage contributions, loans, repayments, and distributions.",
      "To maintain accurate records and accountability across the scheme.",
      "To communicate important updates from leadership and coordinators.",
    ],
  },
  {
    id: "access",
    title: "Who Has Access",
    items: [
      "Management committee members performing their official duties.",
      "Group Coordinators administering members within their groups.",
      "Authorized advisers (legal adviser or consultant) when required for oversight.",
    ],
  },
  {
    id: "retention",
    title: "Record Keeping & Retention",
    items: [
      "Financial records are maintained for accountability across the financial year.",
      "Records support proper distribution and audit of contributions at cycle end.",
    ],
  },
  {
    id: "choices",
    title: "Your Choices",
    items: [
      "You may withdraw membership voluntarily.",
      "You may update membership information through your Group Coordinator.",
    ],
  },
  {
    id: "privacy-contact",
    title: "Contact for Privacy Questions",
    items: [
      "08060707575",
      "07039362614",
      "07038595644",
      "08027148935",
      "08033374418",
    ],
  },
];

type SignupPoliciesModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: PolicyTab;
};

const SignupPoliciesModal: React.FC<SignupPoliciesModalProps> = ({
  open,
  onOpenChange,
  defaultTab = "terms",
}) => {
  const [activeTab, setActiveTab] = useState<PolicyTab>(defaultTab);

  useEffect(() => {
    if (!open) return;
    setActiveTab(defaultTab);
  }, [defaultTab, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-4xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <img
                src={crcLogo}
                alt="CRC Logo"
                className="h-9 w-9 rounded-lg object-cover"
              />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold text-white">
                CRC Terms of Service & Privacy Policy
              </DialogTitle>
              <DialogDescription className="text-emerald-100">
                Guiding principles for Champions Revolving Contributions (CRC).
              </DialogDescription>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified Policy
              </div>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as PolicyTab)}
          className="flex flex-col"
        >
          <div className="border-b border-emerald-100 bg-white px-6 py-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="terms" className="gap-2">
                <FileText className="h-4 w-4" />
                Terms of Service
              </TabsTrigger>
              <TabsTrigger value="privacy" className="gap-2">
                <Shield className="h-4 w-4" />
                Privacy Policy
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="max-h-[65vh]">
            <div className="p-6">
              <TabsContent value="terms">
                <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
                  By creating an account, you agree to abide by these guiding principles and all
                  obligations of CRC membership.
                </div>
                <Accordion type="multiple" className="space-y-2">
                  {termsSections.map((section, index) => (
                    <AccordionItem
                      key={section.id}
                      value={section.id}
                      className="rounded-2xl border border-gray-100 bg-white px-4"
                    >
                      <AccordionTrigger className="py-4 text-left">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                            {index + 1}
                          </span>
                          <span className="text-base font-semibold text-gray-900">
                            {section.title}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {section.description && (
                          <p className="mb-3 text-sm text-gray-600">
                            {section.description}
                          </p>
                        )}
                        {section.items && (
                          <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
                            {section.items.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        )}
                        {section.subSections && (
                          <div className="space-y-4">
                            {section.subSections.map((sub) => (
                              <div key={sub.title} className="rounded-xl bg-gray-50 p-4">
                                <p className="text-sm font-semibold text-gray-900">
                                  {sub.title}
                                </p>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                                  {sub.items.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                        {section.notes && (
                          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                            {section.notes.map((note) => (
                              <p key={note}>{note}</p>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>

              <TabsContent value="privacy">
                <div className="mb-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Shield className="h-4 w-4" />
                      <p className="text-sm font-semibold">
                        Responsible Data Handling
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-blue-700">
                      CRC keeps records to operate fairly, manage contributions, and ensure accountability
                      within the cooperative scheme.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <Users className="h-4 w-4" />
                      <p className="text-sm font-semibold">Coordinator Access</p>
                    </div>
                    <p className="mt-2 text-sm text-emerald-700">
                      Group Coordinators manage records for their members to keep activities transparent
                      and timely.
                    </p>
                  </div>
                </div>

                <Accordion type="multiple" className="space-y-2">
                  {privacySections.map((section, index) => (
                    <AccordionItem
                      key={section.id}
                      value={section.id}
                      className="rounded-2xl border border-gray-100 bg-white px-4"
                    >
                      <AccordionTrigger className="py-4 text-left">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                            {index + 1}
                          </span>
                          <span className="text-base font-semibold text-gray-900">
                            {section.title}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {section.description && (
                          <p className="mb-3 text-sm text-gray-600">
                            {section.description}
                          </p>
                        )}
                        {section.items && (
                          <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
                            {section.items.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between border-t border-gray-100 bg-white px-6 py-4">
            <p className="text-xs text-gray-500">
              Need clarification? Contact CRC through the listed phone numbers.
            </p>
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              onClick={() => onOpenChange(false)}
            >
              I Understand
            </button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SignupPoliciesModal;
