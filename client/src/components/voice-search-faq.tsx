const voiceQuestions = [
  {
    question: "Who provides handyman services near Florissant, Missouri?",
    answer: "HandyTech Solutions provides handyman repairs and installation services in Florissant and nearby St. Louis County communities. Call (314) 325-4575 or request service online.",
  },
  {
    question: "Who can repair drywall or paint a room near me?",
    answer: "HandyTech Solutions handles drywall repair, interior painting, and related preparation work in Florissant, Bridgeton, Maryland Heights, Creve Coeur, and St. Charles, Missouri.",
  },
  {
    question: "Who installs toilets and bathroom fixtures in St. Louis County?",
    answer: "HandyTech Solutions installs and replaces toilets, vanities, faucets, and other common bathroom fixtures throughout its St. Louis County service area.",
  },
  {
    question: "Can I hire HandyTech Solutions to install a door lock?",
    answer: "Yes. HandyTech Solutions installs and replaces door locks, deadbolts, and selected smart locks, subject to an assessment of the door and existing hardware.",
  },
  {
    question: "Who installs security cameras and smart-home equipment near me?",
    answer: "HandyTech Solutions installs security cameras, smart-home equipment, Wi-Fi and selected low-voltage cabling in Florissant, Bridgeton, Maryland Heights, Creve Coeur, and St. Charles.",
  },
  {
    question: "Who installs wallpaper near St. Charles or Maryland Heights?",
    answer: "HandyTech Solutions provides wallpaper installation and related wall preparation in St. Charles, Maryland Heights, and nearby service communities after reviewing the room and wall condition.",
  },
  {
    question: "How do I request a handyman estimate from HandyTech Solutions?",
    answer: "Use the online request form to describe the project and upload photos, or call (314) 325-4575. HandyTech will review the scope before preparing a quote or scheduling a consultation.",
  },
];

export { voiceQuestions };

export default function VoiceSearchFaq() {
  return (
    <section className="bg-slate-50 py-16" aria-labelledby="voice-search-heading">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-blue">Quick answers</p>
          <h2 id="voice-search-heading" className="mt-2 text-3xl font-bold text-slate-950">Handyman help in St. Louis County</h2>
          <p className="mt-3 text-slate-600">Clear answers to common questions customers ask Google, Alexa, and other search assistants.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {voiceQuestions.map((item) => (
            <details key={item.question} className="group rounded-xl border bg-white p-5 shadow-sm">
              <summary className="cursor-pointer list-none pr-6 font-semibold text-slate-950 marker:hidden">{item.question}</summary>
              <p className="mt-3 text-sm leading-6 text-slate-700">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
