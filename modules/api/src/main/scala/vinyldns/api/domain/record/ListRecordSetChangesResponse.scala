/*
 * Copyright 2018 Comcast Cable Communications Management, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package vinyldns.api.domain.record

import vinyldns.api.domain.zone.RecordSetChangeInfo
import vinyldns.core.domain.record.{ListFailedRecordSetChangesResults, ListRecordSetChangesResults, RecordSetChange}

case class ListRecordSetChangesResponse(
    zoneId: String,
    recordSetChanges: List[RecordSetChangeInfo] = Nil,
    nextId: Option[Int],
    startFrom: Option[Int],
    maxItems: Int
)

object ListRecordSetChangesResponse {
  def apply(
      zoneId: String,
      listResults: ListRecordSetChangesResults,
      info: List[RecordSetChangeInfo]
  ): ListRecordSetChangesResponse =
    ListRecordSetChangesResponse(
      zoneId,
      info,
      listResults.nextId,
      listResults.startFrom,
      listResults.maxItems
    )
}

case class ListRecordSetHistoryResponse(
     zoneId: Option[String],
     recordSetChanges: List[RecordSetChangeInfo] = Nil,
     nextId: Option[Int],
     startFrom: Option[Int],
     maxItems: Int
 )

object ListRecordSetHistoryResponse {
  def apply(
             zoneId: Option[String],
             listResults: ListRecordSetChangesResults,
             info: List[RecordSetChangeInfo]
           ): ListRecordSetHistoryResponse =
    ListRecordSetHistoryResponse(
      zoneId,
      info,
      listResults.nextId,
      listResults.startFrom,
      listResults.maxItems
    )
}

case class ListFailedRecordSetChangesResponse(
                                               failedRecordSetChanges: List[RecordSetChange] = Nil,
                                               nextId: Int,
                                               startFrom: Int,
                                               maxItems: Int
                                             )

object ListFailedRecordSetChangesResponse {
  def apply(
             ListFailedRecordSetChanges: ListFailedRecordSetChangesResults
           ): ListFailedRecordSetChangesResponse =
    ListFailedRecordSetChangesResponse(
      ListFailedRecordSetChanges.items,
      ListFailedRecordSetChanges.nextId,
      ListFailedRecordSetChanges.startFrom,
      ListFailedRecordSetChanges.maxItems)}
