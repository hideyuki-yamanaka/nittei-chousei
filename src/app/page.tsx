import EventForm from "@/components/EventForm";
import EventList from "@/components/EventList";

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            新しいイベントを作成
          </h2>
          <p className="text-gray-600 text-sm">
            カレンダーから候補日をタップして、サクッと日程調整を始めましょう。
          </p>
        </div>
        <EventForm />
      </div>

      <hr className="border-gray-200" />

      <EventList />
    </div>
  );
}
