import EventForm from "@/components/EventForm";

export default function CreatePage() {
  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <a
            href="/"
            className="text-gray-400 hover:text-gray-600 transition text-sm"
          >
            &larr; 戻る
          </a>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          新しいイベントを作成
        </h2>
        <p className="text-gray-600 text-sm">
          カレンダーから候補日をタップして、サクッと日程調整を始めましょう。
        </p>
      </div>
      <EventForm />
    </div>
  );
}
